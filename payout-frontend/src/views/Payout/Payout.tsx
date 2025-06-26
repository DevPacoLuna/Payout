import "./Payout.scss";
import { useFormik } from "formik";
import { PayoutForm, payoutSchema } from "./form";
import { postPayout } from "../../services/payout";
import { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ApprovedBenefit {
  trackingNumber: string;
  status: number;
  message:
    | {
        approvedBenefit: string;
        originalApprovedBenefit: string;
        performance: string;
      }
    | string;
}

export const Payout = () => {
  const [approvedBenefit, setApprovedBenefit] = useState<ApprovedBenefit[]>([]);
  const [averagePerformance, setAveragePerformance] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPayouts = async (values: PayoutForm) => {
    setLoading(true);
    const response = await postPayout(values);

    if (response?.status === 201) {
      setApprovedBenefit(response.data);
    } else {
      alert("Failed to fetch payouts. Please try again.");
    }
    setLoading(false);
  };

  const data = {
    labels: ["MAPE Error"],
    datasets: [
      {
        label: "MAPE (%)",
        data: [averagePerformance],
        backgroundColor: ["#1976d2"],
        borderWidth: 1,
      },
    ],
  };

  useEffect(() => {
    // MAPE (Mean Absolute Percentage Error) calculation
    const totalPerformance = approvedBenefit.reduce((acc, benefit) => {
      if (typeof benefit.message === "object") {
        const original = Number(benefit.message.originalApprovedBenefit);
        const approved = Number(benefit.message.approvedBenefit);
        const performance =
          original !== 0 ? Math.abs(original - approved) / original : 0;
        if (!isNaN(performance)) {
          return acc + performance;
        }
      }
      return acc;
    }, 0);

    const count = approvedBenefit.filter(
      (benefit) => typeof benefit.message === "object"
    ).length;

    setAveragePerformance(
      count > 0 ? parseFloat((totalPerformance / count).toFixed(2)) * 100 : 0
    );
  }, [approvedBenefit]);

  const formikPayout = useFormik<PayoutForm>({
    initialValues: {
      startTrackingNumber: 0,
      endTrackingNumber: 0,
    },
    validationSchema: payoutSchema,
    onSubmit: fetchPayouts,
  });

  return (
    <>
      <div className="payout-container">
        <h2 className="payout-title">Payout Calculation</h2>
        <div className="payout-input-group">
          <label className="payout-label">Tracking Number Range:</label>
          <div className="payout-input-range">
            <input
              type="text"
              value={formikPayout.values.startTrackingNumber}
              onChange={(e) =>
                formikPayout.setFieldValue(
                  "startTrackingNumber",
                  e.target.value
                )
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
          disabled={loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
      {approvedBenefit.map((benefit) => (
        <Card
          key={benefit.trackingNumber}
          className="payout-benefit"
          sx={{ mb: 2 }}
        >
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography
                variant="subtitle1"
                className="payout-benefit-tracking"
              >
                Tracking Number: {benefit.trackingNumber}
              </Typography>
              <Typography variant="subtitle2" className="payout-benefit-status">
                Status: {benefit.status}
              </Typography>
            </Box>
            {typeof benefit.message === "object" ? (
              <>
                <Typography variant="body2">
                  Approved Benefit: {benefit.message.approvedBenefit}
                </Typography>
                <Typography variant="body2">
                  Original Approved Benefit:
                  {benefit.message.originalApprovedBenefit}
                </Typography>
                <Box mt={2} display="flex" alignItems="center">
                  <Typography variant="body2" mr={1}>
                    Performance:
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: "#e3f2fd",
                      color: "#1976d2",
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontWeight: "bold",
                      fontSize: "1.25rem",
                      display: "inline-block",
                      minWidth: 60,
                      textAlign: "center",
                    }}
                  >
                    {benefit.message.performance}
                  </Box>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="error">
                {benefit.message}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
      {approvedBenefit.length > 0 && (
        <Box mt={4} className="payout-average-performance">
          <Typography variant="h6">MAPE Error:</Typography>
          <Bar className="payout-performance-chart" data={data} />
        </Box>
      )}
    </>
  );
};
