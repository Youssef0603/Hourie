export type TollBadgeOperator = "hkb" | "fer" | "other";
export type TollBadgeStatus = "active" | "inactive" | "lost";

/** A toll badge stuck on a car or truck. */
export type TollBadge = {
  id: number;
  equipment_id: number;
  operator: TollBadgeOperator;
  badge_number: string;
  serial_number: string | null;
  subscription_number: string | null;
  registered_phone: string | null;
  status: TollBadgeStatus;
  /** Last balance read on the operator's site or statement; null when never checked. */
  balance: string | null;
  balance_checked_on: string | null;
  notes: string | null;
};

export type TollBadgePayload = {
  operator: TollBadgeOperator;
  badge_number: string;
  serial_number: string;
  subscription_number: string;
  registered_phone: string;
  status: TollBadgeStatus;
  balance: string;
  balance_checked_on: string;
  notes: string;
};
