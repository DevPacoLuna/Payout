import { FormEvent, useState } from "react";
import "./Payout.scss";

export const Payout = () => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [docs, setDocs] = useState<FileList | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Tracking Number:", trackingNumber);
    console.log("Docs:", docs);
  };

  return (
    <div className="payout-container">
      <h2 className="payout-title">Payout Calculation</h2>
      <form onSubmit={handleSubmit}>
        <div className="payout-input-group">
          <label className="payout-label">Tracking Number:</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            required
            className="payout-input"
            placeholder="Enter tracking number"
          />
        </div>
        <div className="payout-input-group-docs">
          <label className="payout-label">Documents to Analyze:</label>
          <input
            type="file"
            multiple
            onChange={(e) => setDocs(e.target.files)}
            required
            className="payout-input-file"
          />
        </div>
        <button type="submit" className="payout-submit-button">
          Send
        </button>
      </form>
    </div>
  );
};
