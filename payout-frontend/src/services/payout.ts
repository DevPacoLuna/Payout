import { PayoutForm } from "../views/Payout/form";
import { axiosService } from "./axios";

export const postPayout = async (data: PayoutForm) => {
  try {
    const response = await axiosService.post("/payouts", data);

    return response.data;
  } catch (error) {
    console.error(error);
  }
};
