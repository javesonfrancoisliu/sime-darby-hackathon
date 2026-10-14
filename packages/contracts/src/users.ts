import { z } from "zod";
import { Area, AvailabilitySlot, Category, Id, IsoDateTime, Location, Role } from "./common";

export const Verification = z.enum(["pending", "verified", "rejected", "not_required"]);
export type Verification = z.infer<typeof Verification>;

const MAX_SKILLS = Category.options.length;
const MAX_SLOTS = 21;

const Profile = z.object({
  name: z.string().trim().min(1).max(80),
  area: Area,
  location: Location,
  skills: z.array(Category).max(MAX_SKILLS),
  experience: z.string().trim().max(500),
  availability: z.array(AvailabilitySlot).max(MAX_SLOTS),
});

export const User = Profile.extend({
  id: Id,
  role: Role,
  verification: Verification,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type User = z.infer<typeof User>;

// Defaults live only on create; a partial update must never inject them.
export const CreateUserBody = Profile.extend({
  role: Role,
  skills: Profile.shape.skills.default([]),
  experience: Profile.shape.experience.default(""),
  availability: Profile.shape.availability.default([]),
});
export type CreateUserBody = z.infer<typeof CreateUserBody>;

export const UpdateMeBody = Profile.partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });
export type UpdateMeBody = z.infer<typeof UpdateMeBody>;

export const DemoUser = User.pick({
  id: true,
  name: true,
  role: true,
  area: true,
  verification: true,
});
export type DemoUser = z.infer<typeof DemoUser>;

export const DemoUsersQuery = z.object({ role: Role.optional() });

export const DemoUsersResponse = z.object({ users: z.array(DemoUser) });
export type DemoUsersResponse = z.infer<typeof DemoUsersResponse>;

export const VolunteersQuery = z.object({
  verification: z.enum(["pending", "verified", "rejected"]).optional(),
});

export const VolunteersResponse = z.object({ volunteers: z.array(User) });
export type VolunteersResponse = z.infer<typeof VolunteersResponse>;

export const ReviewVolunteerBody = z.object({ decision: z.enum(["verified", "rejected"]) });
export type ReviewVolunteerBody = z.infer<typeof ReviewVolunteerBody>;
