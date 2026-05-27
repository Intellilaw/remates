import { readDb } from "../../data/store.js";
import { notFound } from "../../utils/http.js";
import { getActor } from "../../domain/app-domain.js";
import { handlePublicRoutes } from "./public-routes.js";
import { handlePaymentRoutes } from "./payment-routes.js";
import { handleAdminUserRoutes } from "./admin-user-routes.js";
import { handleAdminCaseRoutes } from "./admin-case-routes.js";
import { handleAdminPropertyRoutes } from "./admin-property-routes.js";
import { handleAdminContentRoutes } from "./admin-content-routes.js";
import { handleMobileRemateRoutes } from "./mobile-remate-routes.js";

const routeHandlers = [
  handlePublicRoutes,
  handlePaymentRoutes,
  handleAdminUserRoutes,
  handleAdminCaseRoutes,
  handleAdminPropertyRoutes,
  handleAdminContentRoutes,
  handleMobileRemateRoutes
];

export async function handleApi(req, res, pathname) {
  const db = await readDb();
  const actor = getActor(db, req);

  for (const handler of routeHandlers) {
    const handled = await handler(req, res, pathname, { db, actor });
    if (handled !== false) {
      return;
    }
  }

  return notFound(res);
}
