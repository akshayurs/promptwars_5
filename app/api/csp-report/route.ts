import { createCspReportRoute } from "@/lib/api/cspReport";
import { cspReportDependencies } from "@/lib/api/deps";
import { methodNotAllowed } from "@/lib/api/responses";

export const POST = createCspReportRoute(cspReportDependencies);
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
