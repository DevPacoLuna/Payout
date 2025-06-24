import { Button, Card, Typography } from "@mui/material";
import "./Home.scss";

export const Home = () => {
  return (
    <div className="home-container">
      <Card elevation={8} className="home-card">
        <Typography variant="h3" gutterBottom fontWeight={700}>
          Welcome to Payout Calculator
        </Typography>
        <Typography color="secondary" gutterBottom sx={{ mb: 2 }}>
          Easily calculate payouts and manage your transactions with confidence.
        </Typography>
        <Typography color="secondary" gutterBottom>
          Click below to get started with your first payout calculation.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          href="/payout"
          size="large"
          className="home-button"
        >
          Go to Payout
        </Button>
      </Card>
    </div>
  );
};
