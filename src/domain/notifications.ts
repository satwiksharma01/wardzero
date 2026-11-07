export type EmailDeliveryState =
  | "Disabled"
  | "Pending"
  | "Sending"
  | "Retry"
  | "Accepted"
  | "Failed"
  | "Cancelled";
export type EmailDelivery = {
  state: EmailDeliveryState;
  attempts: number;
  providerReference: string | null;
  providerAcceptedAt: string | null;
  nextAttemptAt: string | null;
  errorCode: string | null;
};
