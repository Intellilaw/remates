import { mutateDb } from "../../data/store.js";
import { exposeUser } from "../../services/auth-service.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../../utils/http.js";
import { hashPassword, normalizeEmail, randomId, sanitizeText } from "../../utils/security.js";
import { STAFF_ACCESS_ROLES, USER_ROLES, USER_STATUSES, caseSnapshot, computeOverview, logAudit, requireRoles } from "../../domain/app-domain.js";

export async function handleAdminUserRoutes(req, res, pathname, { db, actor }) {
  if (pathname === "/api/admin/overview" && req.method === "GET") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    return sendJson(res, 200, { item: computeOverview(db) });
  }

  if (pathname === "/api/admin/users" && req.method === "GET") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    const items = db.users.map((user) => {
      const userCases = db.cases.filter((item) => item.userId === user.id);
      const userPayments = db.payments.filter((payment) => userCases.some((item) => item.id === payment.caseId));
      return {
        ...exposeUser(user),
        caseCount: userCases.length,
        paymentCount: userPayments.length,
        approvedRevenueMxn: userPayments.filter((item) => item.status === "APPROVED").reduce((sum, item) => sum + item.amountMxn, 0)
      };
    });
    return sendJson(res, 200, { items });
  }

  if (pathname === "/api/admin/users" && req.method === "POST") {
    if (!requireRoles(res, actor, ["ADMIN"])) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const email = normalizeEmail(body.email);
      const fullName = sanitizeText(body.fullName || "", 120);
      const phone = sanitizeText(body.phone || "", 40);
      const password = String(body.password || "");
      const roles = [...new Set((Array.isArray(body.roles) ? body.roles : [])
        .map((role) => String(role).trim().toUpperCase())
        .filter(Boolean))];
      const status = body.status || "ACTIVE";

      if (!email || !fullName || password.length < 8) {
        throw new Error("Nombre, correo y contraseña de al menos 8 caracteres son obligatorios");
      }
      if (!roles.length || roles.some((role) => !USER_ROLES.includes(role)) || !roles.some((role) => STAFF_ACCESS_ROLES.includes(role))) {
        throw new Error("El usuario interno necesita al menos un rol interno válido");
      }
      if (!USER_STATUSES.includes(status)) {
        throw new Error("Estatus inválido");
      }

      const updated = await mutateDb(async (draft) => {
        if (draft.users.some((user) => user.email === email)) {
          throw new Error("Este correo ya está registrado");
        }
        const { salt, hash } = hashPassword(password);
        const user = {
          id: randomId("usr"),
          email,
          fullName,
          phone,
          status,
          roles,
          salt,
          passwordHash: hash,
          createdAt: new Date().toISOString()
        };
        draft.users.push(user);
        draft.authIdentities.push({
          id: randomId("auth"),
          userId: user.id,
          provider: "email",
          providerSubject: email
        });
        logAudit(draft, actor, "USER_CREATED", "user", user.id, exposeUser(user));
        return draft;
      });
      const user = updated.users.find((item) => item.email === email);
      return sendJson(res, 201, { item: exposeUser(user) });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  const adminUserDashboardMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/client-dashboard$/);
  if (adminUserDashboardMatch && req.method === "GET") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    const targetUser = db.users.find((item) => item.id === adminUserDashboardMatch[1]);
    if (!targetUser) {
      return notFound(res, "Usuario no encontrado");
    }
    const items = db.cases
      .filter((item) => item.userId === targetUser.id)
      .map((item) => caseSnapshot(db, item, targetUser));
    return sendJson(res, 200, {
      user: exposeUser(targetUser),
      items
    });
  }

  if (adminUserMatch && req.method === "PATCH") {
    if (!requireRoles(res, actor, ["ADMIN"])) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const userId = adminUserMatch[1];
      const updated = await mutateDb(async (draft) => {
        const user = draft.users.find((item) => item.id === userId);
        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        if (body.email !== undefined) {
          const email = normalizeEmail(body.email);
          if (!email) {
            throw new Error("Correo inválido");
          }
          if (draft.users.some((item) => item.id !== userId && item.email === email)) {
            throw new Error("Este correo ya está registrado");
          }
          user.email = email;
          draft.authIdentities
            .filter((identity) => identity.userId === userId && identity.provider === "email")
            .forEach((identity) => {
              identity.providerSubject = email;
            });
        }

        if (body.fullName !== undefined) {
          const fullName = sanitizeText(body.fullName, 120);
          if (!fullName) {
            throw new Error("Nombre inválido");
          }
          user.fullName = fullName;
        }

        if (body.password !== undefined && String(body.password || "")) {
          const password = String(body.password || "");
          if (password.length < 8) {
            throw new Error("La contraseña debe tener al menos 8 caracteres");
          }
          const { salt, hash } = hashPassword(password);
          user.salt = salt;
          user.passwordHash = hash;
        }

        if (body.phone !== undefined) {
          user.phone = sanitizeText(body.phone, 40);
        }

        if (body.status !== undefined) {
          if (!USER_STATUSES.includes(body.status)) {
            throw new Error("Estatus inválido");
          }
          user.status = body.status;
        }

        if (Array.isArray(body.roles)) {
          const roles = [...new Set(body.roles.map((role) => String(role).trim().toUpperCase()).filter(Boolean))];
          if (!roles.length || roles.some((role) => !USER_ROLES.includes(role))) {
            throw new Error("Roles inválidos");
          }
          if (userId === actor.id && !roles.includes("ADMIN")) {
            throw new Error("No puedes quitarte tu propio rol de administrador");
          }
          user.roles = roles;
        }

        user.updatedAt = new Date().toISOString();
        return draft;
      });
      const user = updated.users.find((item) => item.id === userId);
      return sendJson(res, 200, { item: exposeUser(user) });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  if (adminUserMatch && req.method === "DELETE") {
    if (!requireRoles(res, actor, ["ADMIN"])) {
      return;
    }
    try {
      const userId = adminUserMatch[1];
      if (userId === actor.id) {
        throw new Error("No puedes eliminar tu propia cuenta");
      }
      await mutateDb(async (draft) => {
        const userIndex = draft.users.findIndex((item) => item.id === userId);
        if (userIndex === -1) {
          throw new Error("Usuario no encontrado");
        }
        draft.users.splice(userIndex, 1);
        draft.authIdentities = draft.authIdentities.filter((identity) => identity.userId !== userId);
        return draft;
      });
      return sendJson(res, 204, null);
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  return false;
}
