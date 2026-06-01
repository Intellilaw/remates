window.rematesCliente = {
  openAuth,
  closeAuth,
  switchAuth,
  toggleAuthPassword,
  socialLogin: handleSocialLogin
};

document.addEventListener("click", async (event) => {
  const clickedElement = getEventElementTarget(event);
  if (!clickedElement) {
    return;
  }

  const target = clickedElement.closest("[data-action]");
  if (!target) {
    if (clickedElement.closest("[data-modal-card='true']")) {
      return;
    }
    return;
  }

  const action = target.dataset.action;

  try {
    if (action === "open-auth") {
      openAuth(target.dataset.mode || "login");
    }

    if (action === "close-auth") {
      closeAuth();
    }

    if (action === "logout") {
      logout();
      if (isDashboardRoute) {
        render();
      }
    }

    if (action === "open-property") {
      await openProperty(target.dataset.slug);
    }

    if (action === "close-property") {
      state.propertyDetail = null;
      render();
    }

    if (action === "share-property") {
      await shareProperty();
    }

    if (action === "copy-property-link") {
      await copyPropertyLink();
    }

    if (action === "scroll") {
      document.querySelector(target.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (action === "interest-property") {
      const propertyId = target.dataset.propertyId;
      if (!state.me) {
        state.pendingInterestPropertyId = propertyId;
        openAuth("register");
        return;
      }
      const existingCase = findCaseByPropertyId(propertyId);
      if (existingCase) {
        setSelectedCase(existingCase.id);
        if (!isDashboardRoute) {
          goToDashboard();
        } else {
          render();
        }
        return;
      }
      await createCase(propertyId);
    }

    if (action === "select-case") {
      setSelectedCase(target.dataset.caseId);
      render();
      const activeCase = getSelectedCase();
      if (activeCase?.conversationId) {
        await loadMessages(activeCase.conversationId);
        await ensureConversationPolling();
      }
    }

    if (action === "checkout") {
      await startCheckout(target.dataset.caseId, target.dataset.stageCode);
    }

    if (action === "close-checkout") {
      state.checkoutPayment = null;
      render();
    }

    if (action === "confirm-checkout") {
      await confirmCheckout(target.dataset.paymentId);
    }

    if (action === "social-login") {
      await handleSocialLogin(target.dataset.provider);
      return;
    }
  } catch (error) {
    setToast(error.message);
  }
});

async function handleSocialLogin(providerValue) {
  const provider = String(providerValue || "").trim().toLowerCase();
  const providerUrl = state.providers?.providers?.[provider];
  if (providerUrl) {
    window.location.assign(providerUrl);
    return;
  }

  if (state.providers && !state.providers.demoFallback) {
    throw new Error("Este proveedor de acceso no está configurado.");
  }

  const payload = await api("/api/auth/social-demo", {
    method: "POST",
    body: JSON.stringify({ provider })
  });
  state.token = payload.token;
  localStorage.setItem("remates_client_token", payload.token);
  state.authOpen = false;
  const pendingPropertyId = state.pendingInterestPropertyId;
  state.pendingInterestPropertyId = "";
  if (pendingPropertyId) {
    await createCase(pendingPropertyId);
    return;
  }
  await loadSession();
  await ensureConversationPolling();
  setToast(`Sesión iniciada con ${provider === "facebook" ? "Facebook" : "Google"}.`);
  if (!isDashboardRoute) {
    goToDashboard();
  } else {
    render();
  }
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const formName = form.dataset.form;
  if (!formName) {
    return;
  }

  event.preventDefault();
  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);

  try {
    if (formName === "login") {
      validateAuthForm(formName, formData);
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      state.token = payload.token;
      localStorage.setItem("remates_client_token", payload.token);
      state.authOpen = false;
      const pendingPropertyId = state.pendingInterestPropertyId;
      state.pendingInterestPropertyId = "";
      if (pendingPropertyId) {
        await createCase(pendingPropertyId);
        return;
      }
      await loadSession();
      await ensureConversationPolling();
      setToast("Sesión iniciada.");
      if (!isDashboardRoute) {
        goToDashboard();
      } else {
        render();
      }
    }

    if (formName === "register") {
      validateAuthForm(formName, formData);
      const payload = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          gender: formData.get("gender"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password")
        })
      });
      state.token = payload.token;
      localStorage.setItem("remates_client_token", payload.token);
      state.authOpen = false;
      const pendingPropertyId = state.pendingInterestPropertyId;
      state.pendingInterestPropertyId = "";
      if (pendingPropertyId) {
        await createCase(pendingPropertyId);
        return;
      }
      await loadSession();
      setToast("Cuenta creada correctamente.");
      if (!isDashboardRoute) {
        goToDashboard();
      } else {
        render();
      }
    }

    if (formName === "password-reset-request") {
      const payload = await api("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          app: "web"
        })
      });
      state.passwordResetUrl = payload.resetUrl || "";
      state.authMode = "reset-sent";
      setToast("Revisa tu correo de recuperación.");
      render();
    }

    if (formName === "password-reset-confirm") {
      await api("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({
          token: state.passwordResetToken,
          password: formData.get("password")
        })
      });
      state.authMode = "login";
      state.passwordResetToken = "";
      state.passwordResetUrl = "";
      window.history.replaceState({}, "", window.location.pathname || "/");
      setToast("Contraseña actualizada. Ya puedes iniciar sesión.");
      render();
    }

    if (formName === "message") {
      const body = String(formData.get("body") || "").trim();
      if (!body) {
        throw new Error("Escribe un mensaje antes de enviarlo.");
      }
      await sendMessage(body);
      form.reset();
      setToast("Mensaje enviado.");
    }
  } catch (error) {
    setToast(error.message);
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }

  const filterKey = target.dataset.filter;
  if (!filterKey) {
    return;
  }

  state.filters[filterKey] = target.value;
  render();
});

window.addEventListener("beforeunload", stopPolling);

render();
bootstrap();
