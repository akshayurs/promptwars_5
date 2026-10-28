import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

import { futureDate } from "./fixtures";

type User = ReturnType<typeof userEvent.setup>;

const enter = async (user: User, label: string | RegExp, value: string): Promise<void> => {
  await user.click(screen.getByLabelText(label));
  await user.paste(value);
};

export const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  date: string,
): Promise<void> => {
  await enter(user, "Event name", "  Priya's Party  ");
  await enter(user, "Event date", date);
  await enter(user, "Guest count", "80");
  await enter(user, "Total budget", "250000");
  await enter(user, "City or venue area", "  Mumbai ");
  await enter(user, "Vibe and preferences", "  Retro disco  ");
};

const fillWedding = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await enter(user, "Couple's names", " Asha and Ravi ");
  await enter(user, /^Ceremony style/, "Traditional Hindu");
};

export const fillValidWedding = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await fillForm(user, futureDate(30));
  await fillWedding(user);
};

export const submitForm = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.click(screen.getByRole("button", { name: "Generate plan" }));
};
