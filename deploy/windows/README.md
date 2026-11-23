# Deploying Hourie on Windows Server (Azure VM + IIS)

Step-by-step installation of Hourie on the company's Azure VM, from an empty server to a working `https://assets.hourie.com` with your existing data.

Default paths used by the scripts (change them with the scripts' parameters if IT uses others):

| What | Where |
|---|---|
| Application code | `C:\inetpub\hourie` |
| Data disk | `D:\Hourie` |
| Uploaded files | `D:\Hourie\uploads\equipment-documents` and `...\equipment-images` |
| Application backups | `D:\Hourie\backups` |
| PHP | `C:\Program Files\PHP` |

---

## 1. What IT provides first

Check every item before starting:

- [ ] VM with Windows Server 2022 or 2025, 4 vCPU, 8 GB RAM, joined to `hourie.local`.
- [ ] A 128 GB managed data disk mounted as `D:`.
- [ ] DNS: `assets.hourie.com` points to the VM or the Application Gateway.
- [ ] SSL certificate for `assets.hourie.com`, either installed on IIS or on the Application Gateway.
- [ ] If an **Application Gateway** sits in front of IIS: its private IP address(es). They go into `TRUSTED_PROXIES` in step 4.
- [ ] Your access: Azure Bastion or VPN with a deployment account that is a local administrator on the VM.
- [ ] Outbound internet from the VM to `github.com`, `getcomposer.org`, `registry.npmjs.org`, `login.microsoftonline.com` and `graph.microsoft.com`.
- [ ] Email: an **Entra app registration**. See [step 7](#7-email-reminders-microsoft-graph).
- [ ] Azure Backup (Recovery Services vault) enabled on the VM and the data disk, daily, kept 30 days.

---

## 2. Install the software (once)

Run everything below in an **administrator PowerShell**.

**IIS with CGI and URL Rewrite**
```powershell
Install-WindowsFeature Web-Server, Web-CGI, Web-Mgmt-Console
```
Then install the **IIS URL Rewrite 2.1** module from Microsoft (`rewrite_amd64_en-US.msi`).

**PHP 8.4, Non-Thread-Safe, x64**
1. Download PHP 8.4 NTS x64 from windows.php.net.
2. Unzip it to `C:\Program Files\PHP`.
3. Install the matching **Visual C++ Redistributable**.
4. Copy `php.ini-production` to `php.ini` and set these values:

```ini
extension_dir = "ext"
extension=curl
extension=fileinfo
extension=gd
extension=intl
extension=mbstring
extension=openssl
extension=pdo_mysql
extension=zip
zend_extension=opcache
opcache.enable=1

memory_limit = 512M
max_execution_time = 120
upload_max_filesize = 55M
post_max_size = 55M

; Needed for the Microsoft Graph email calls over HTTPS
curl.cainfo = "C:\Program Files\PHP\extras\ssl\cacert.pem"
openssl.cafile = "C:\Program Files\PHP\extras\ssl\cacert.pem"
```

Download `cacert.pem` from curl.se/docs/caextract.html to the path above. Without it, PHP on Windows can't verify HTTPS, and reminder emails fail.

Check it worked with `& "C:\Program Files\PHP\php.exe" -m`. The list must include `curl`, `gd`, `intl`, `mbstring`, `openssl`, `pdo_mysql` and `zip`.

**MySQL 8.4 LTS**
1. Install MySQL Server 8.4 and set its **data directory to `D:\Hourie\mysql`**.
2. Keep it listening on `127.0.0.1` only. The database must never be reachable from the internet.
3. Create the database and its user:

```sql
CREATE DATABASE hourie CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hourie'@'localhost' IDENTIFIED BY '<strong password>';
GRANT ALL PRIVILEGES ON hourie.* TO 'hourie'@'localhost';
```

**Composer 2, Node.js 24 LTS and Git**
Install them with their Windows installers, using the default paths.

---

## 3. Get the code

The repository is private. Use a read-only GitHub **deploy key** or a **fine-grained token** limited to this repository.

```powershell
git clone https://github.com/Youssef0603/Hourie.git C:\inetpub\hourie
```

---

## 4. Configure the application

```powershell
cd C:\inetpub\hourie\hourie-api
Copy-Item .env.windows.example .env
& "C:\Program Files\PHP\php.exe" artisan key:generate
```

Edit `.env` and fill in:

| Setting | Value |
|---|---|
| `DB_PASSWORD` | The MySQL password from step 2 |
| `TRUSTED_PROXIES` | The Application Gateway IP(s), comma-separated. Leave empty if there is no gateway. |
| `MICROSOFT_GRAPH_*` | From step 7. They can stay empty until then. |
| `MYSQLDUMP_BINARY`, `MYSQL_BINARY` | Change only if MySQL is not under `C:\Program Files\MySQL\MySQL Server 8.4\bin`. |

Keep `APP_DEBUG=false`. Never commit `.env`.

---

## 5. Deploy, create the IIS site, start background tasks

```powershell
cd C:\inetpub\hourie
.\deploy\windows\deploy.ps1          # PHP and JS dependencies, migrations, caches, React build
.\deploy\windows\configure-iis.ps1   # IIS site, app pool, folders on D:, permissions
.\deploy\windows\install-tasks.ps1   # scheduler (every minute) and queue worker (at boot)
```

Then ask IT to add the **HTTPS binding** with the certificate on the site "Hourie Assets", unless the gateway handles HTTPS.

The scheduler runs:
- the reminders every day: inspections at 08:00, insurance at 08:05, bonds at 08:10, temporary admissions at 08:15;
- an application backup to `D:\Hourie\backups` at 12:30 and 17:30.

All times are UTC, which is the same as Abidjan time.

---

## 6. Move your existing data from the Mac

Do this once, on go-live day. **Stop using the Mac version after the export**, otherwise any later change is lost.

**On the Mac** (in `hourie-api`), export everything into a folder:
```bash
mkdir -p ~/Desktop/hourie-export
BACKUP_ROOT=~/Desktop/hourie-export BACKUP_VOLUME_UUID= php artisan hourie:backup
```
This creates `~/Desktop/hourie-export/HOURIE_BACKUPS/<date>/`. The folder holds `database.zip`, `uploaded-files.zip`, `checksums.txt` and `backup-info.json` (about 150 MB today).

**Copy that dated folder to the VM** as `D:\Hourie\import\<date>`. Use the method IT allows: Bastion native client file transfer, the VPN, or company OneDrive. The checksums catch any file damaged on the way.

**On the VM:**
```powershell
cd C:\inetpub\hourie\hourie-api
& "C:\Program Files\PHP\php.exe" artisan hourie:restore "D:\Hourie\import\<date>"
```

The command:
1. checks the checksums;
2. asks for confirmation, then replaces the server database with the backup;
3. puts the uploaded files back on `D:`;
4. runs any newer migrations;
5. ends with a table of counts.

Compare these counts with the Mac: users, equipment, purchase orders and subcontracts. **"Documents introuvables" must be 0.**

Users keep their usernames and passwords, so there's no need to run `users:create`.

Then check the purchase-order numbers:
```powershell
& "C:\Program Files\PHP\php.exe" artisan purchase-orders:renumber --dry-run
```
It should list nothing to change, because the Mac data is already renumbered.

Finally, delete `D:\Hourie\import` once the site is checked. It contains a full copy of the data.

> This was tested end to end on 23/11/2026: a real Mac backup restored into an empty database gave identical row counts in all 59 tables and the same 337 files.
> The Mac runs MySQL 5.7 and the server runs 8.4. Importing a 5.7 export into 8.4 is supported. If MySQL ever reports an error on import, send the message: it is usually a collation setting.

**Fresh install without data** (testing only): skip this step and create a first manager instead:
```powershell
& "C:\Program Files\PHP\php.exe" artisan users:create --role=manager
```

---

## 7. Email reminders (Microsoft Graph)

Reminders are sent from `notifications@hourie.com` through Microsoft Graph. No SMTP is needed.

**Ask IT for:**
1. An Entra **app registration**, for example "Hourie Asset Management".
2. **Application** permission **`Mail.Send`** (Microsoft Graph), with **admin consent** granted.
3. An **Exchange application access policy** that limits the app to the `notifications@hourie.com` mailbox only, so it can't send as anyone else.
4. A **client secret**, plus its expiry date. Put a reminder in the calendar to renew it.

**Put the values into `.env`:**
```ini
MICROSOFT_GRAPH_TENANT_ID=<Directory (tenant) ID>
MICROSOFT_GRAPH_CLIENT_ID=<Application (client) ID>
MICROSOFT_GRAPH_CLIENT_SECRET=<secret value>
```

Then reload the configuration and send a test email:
```powershell
& "C:\Program Files\PHP\php.exe" artisan config:cache
& "C:\Program Files\PHP\php.exe" artisan hourie:health-check --email=<your-email>@hourie.com
```

---

## 8. Verify

```powershell
.\deploy\windows\verify-deployment.ps1 -TestEmail <your-email>@hourie.com
```
The script checks:
- the scheduler and queue tasks;
- the database, storage and email (through `hourie:health-check`);
- `/up`, `/api/health`, the CSRF cookie, the home page, and that the API refuses visitors who aren't logged in.

Then **restart the VM**. Within 30 minutes of the boot, run:
```powershell
.\deploy\windows\verify-restart-recovery.ps1
```
This proves everything comes back on its own after a reboot.

**Check by hand in a browser:**
- [ ] Log in, then log out.
- [ ] Open an asset, a generator photo, an insurance PDF and a delivery note.
- [ ] Open a purchase order PDF ("Aperçu") and a subcontract.
- [ ] Switch to **AR** and check the right-to-left layout and the translations.
- [ ] Upload a document, then delete it.
- [ ] Next morning, confirm the reminder emails arrived.

---

## 9. Backups and restore test

There are two layers:
- **Azure Backup** of the whole VM and data disk, daily, kept 30 days. Managed by IT.
- **Application backups** (`hourie:backup`) twice a day in `D:\Hourie\backups`, the 30 most recent kept. Each is a database export plus all uploaded files, with checksums.

Test a restore **before launch and then every quarter**. Copy a backup folder to a test VM, or to a test database on another machine, and run `hourie:restore`. A backup that has never been restored is not a backup.

---

## 10. Updating later

```powershell
cd C:\inetpub\hourie
git pull origin main
.\deploy\windows\deploy.ps1
.\deploy\windows\verify-deployment.ps1
```

`deploy.ps1` does the rest:
- runs any new migrations;
- rebuilds the frontend;
- refreshes the caches;
- tells the queue worker to restart on the new code.

Before a big update, run a manual backup first:
```powershell
& "C:\Program Files\PHP\php.exe" artisan hourie:backup
```

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| 500 error on every page | Check `hourie-api\storage\logs\laravel-<date>.log`. Usually `.env` (database password) or folder permissions: run `configure-iis.ps1` again. |
| Uploads over 2 MB fail | `upload_max_filesize` / `post_max_size` not set to 55M in `php.ini`. Recycle the app pool after changing it. |
| Emails fail with an SSL error | `curl.cainfo` / `openssl.cafile` missing in `php.ini`. |
| Emails fail with 401/403 | Graph secret expired, admin consent missing, or the access policy doesn't include `notifications@hourie.com`. |
| Everyone gets "too many login attempts" together | There is a gateway but `TRUSTED_PROXIES` is empty or wrong. Set the gateway IP(s), then run `php artisan config:cache`. |
| Links or redirects use `http://` | Same cause: `TRUSTED_PROXIES` is not set. |
| Reminders not sent | The scheduler task is stopped. Run `Get-ScheduledTask "Hourie Laravel Scheduler"`, then `verify-deployment.ps1`. |
