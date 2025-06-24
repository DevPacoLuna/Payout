import "./Payout.scss";
import { useFormik } from "formik";
import { PayoutForm, payoutSchema } from "./form";
import { postPayout } from "../../services/payout";

export const Payout = () => {
  const fetchPayouts = async (values: PayoutForm) => {
    const response = await postPayout(values);
    if (response.status === 201) {
      alert("Payouts fetched successfully!");
    } else {
      alert("Failed to fetch payouts. Please try again.");
    }
  };

  const formikPayout = useFormik<PayoutForm>({
    initialValues: {
      startTrackingNumber: 0,
      endTrackingNumber: 0,
    },
    validationSchema: payoutSchema,
    onSubmit: fetchPayouts,
  });

  return (
    <div className="payout-container">
      <h2 className="payout-title">Payout Calculation</h2>
      <div className="payout-input-group">
        <label className="payout-label">Tracking Number Range:</label>
        <div className="payout-input-range">
          <input
            type="text"
            value={formikPayout.values.startTrackingNumber}
            onChange={(e) =>
              formikPayout.setFieldValue("startTrackingNumber", e.target.value)
            }
            required
            className="payout-input"
            placeholder="Start number"
            name="startTrackingNumber"
          />
          <span className="payout-input-range-separator">to</span>
          <input
            type="text"
            value={formikPayout.values.endTrackingNumber}
            onChange={(e) =>
              formikPayout.setFieldValue("endTrackingNumber", e.target.value)
            }
            required
            className="payout-input"
            placeholder="End number"
            name="endTrackingNumber"
          />
        </div>
        {formikPayout.touched.startTrackingNumber &&
          formikPayout.errors.startTrackingNumber && (
            <div className="payout-error-label">
              {formikPayout.errors.startTrackingNumber}
            </div>
          )}
        {formikPayout.touched.endTrackingNumber &&
          formikPayout.errors.endTrackingNumber && (
            <div className="payout-error-label">
              {formikPayout.errors.endTrackingNumber}
            </div>
          )}
      </div>
      <button
        className="payout-submit-button"
        onClick={() => formikPayout.handleSubmit()}
      >
        Send
      </button>
    </div>
  );
};
