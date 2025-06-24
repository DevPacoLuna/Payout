import * as Yup from "yup";

export interface PayoutForm {
  startTrackingNumber: number;
  endTrackingNumber: number;
}

export const payoutSchema: Yup.Schema<PayoutForm> = Yup.object().shape({
  startTrackingNumber: Yup.number()
    .min(1, "The start tracking number must be at least 1 character")
    .max(1500, "The start tracking number must be at most 10 characters")
    .required("The start tracking number is required"),
  endTrackingNumber: Yup.number()
    .min(1, "The end tracking number must be at least 1 character")
    .max(1500, "The end tracking number must be at most 10 characters")
    .required("The end tracking number is required")
    .moreThan(Yup.ref("startTrackingNumber")),
});
