import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Payout } from "./views/Payout/Payout";
import { Home } from "./views/Home/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/payout" element={<Payout />} />
      </Routes>
    </Router>
  );
}

export default App;
