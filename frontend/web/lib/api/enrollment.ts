import { request } from "./client";
import type { Enrollment, EnrollmentInput, EnrollmentReviewInput } from "./types";

export const enrollmentApi = {
  getEnrollment: () => request<Enrollment>("/api/enrollment"),

  submitEnrollment: (input: EnrollmentInput) =>
    request<Enrollment>("/api/enrollment", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

export const adminEnrollmentApi = {
  listEnrollments: (status?: string) =>
    request<Enrollment[]>(
      `/api/admin/enrollments${status && status !== "all" ? `?status=${status}` : ""}`,
      { admin: true },
    ),

  getEnrollmentById: (id: string) =>
    request<Enrollment>(`/api/admin/enrollments/${id}`, { admin: true }),

  initialReview: (id: string, approve: boolean, note: string) =>
    request<Enrollment>(`/api/admin/enrollments/${id}/initial-review?approve=${approve}`, {
      admin: true,
      method: "POST",
      body: JSON.stringify({ note }),
    }),

  finalReview: (id: string, approve: boolean, note: string) =>
    request<Enrollment>(`/api/admin/enrollments/${id}/final-review?approve=${approve}`, {
      admin: true,
      method: "POST",
      body: JSON.stringify({ note }),
    }),
};
