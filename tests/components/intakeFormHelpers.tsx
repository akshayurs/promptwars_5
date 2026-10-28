import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

import { futureDate } from "./fixtures";

export const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  date: string,
): Promise<void> => {
  await user.type(screen.getByLabelText("Event name"), "  Priya's Party  ");
  await user.type(screen.getByLabelText("Event date"), date);
  await user.type(screen.getByLabelText("Guest count"), "80");
  await user.type(screen.getByLabelText("Total budget"), "250000");
  await user.type(screen.getByLabelText("City or venue area"), "  Mumbai ");
  await user.type(screen.getByLabelText("Vibe and preferences"), "  Retro disco  ");
};

const fillWedding = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.type(screen.getByLabelText("Couple's names"), " Asha and Ravi ");
  await user.type(screen.getByLabelText(/^Ceremony style/), "Traditional Hindu");
};

export const fillValidWedding = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await fillForm(user, futureDate(30));
  await fillWedding(user);
};

export const submitForm = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.click(screen.getByRole("button", { name: "Generate plan" }));
};
