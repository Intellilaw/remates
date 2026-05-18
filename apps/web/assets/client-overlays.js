function renderPropertyDrawer() {
  if (!state.propertyDetail) {
    return "";
  }

  const relatedCase = findCaseByPropertyId(state.propertyDetail.id);
  const showDate = Boolean(state.propertyDetail.auctionDate);
  const showCourtAndTime = Boolean(state.propertyDetail.courtName || state.propertyDetail.auctionTime);
  const showFull = Boolean(state.propertyDetail.visibility?.showFullDetails);

  return `
    <div class="drawer-backdrop" data-action="close-property">
      <div class="drawer" data-modal-card="true">
        <div class="drawer__grid">
          <div>
            <span class="badge">${escapeHtml(state.propertyDetail.city)} · ${escapeHtml(state.propertyDetail.state)}</span>
            <h2>${escapeHtml(state.propertyDetail.title)}</h2>
            <p>${escapeHtml(state.propertyDetail.shortDescription)}</p>
            <div class="stage-strip">
              <span class="chip">Avalúo ${formatMoney(state.propertyDetail.estimatedValueMxn)}</span>
              <span class="chip">Postura legal ${formatMoney(state.propertyDetail.legalBidMxn)}</span>
              <span class="chip">${escapeHtml(auctionRoundLabel(state.propertyDetail.auctionRound))}</span>
              <span class="chip">${escapeHtml(state.propertyDetail.zoneLabel)}</span>
              ${showDate ? `<span class="chip">Subasta ${escapeHtml(formatDate(state.propertyDetail.auctionDate))}</span>` : ""}
            </div>

            ${!state.me ? `
              <div class="section-card" style="margin-top:16px;">
                <div class="kicker">Información limitada</div>
                <p>Crea tu cuenta para guardar este inmueble y dar seguimiento al proceso. La fecha y postura legal son visibles; el órgano subastador, la hora y el detalle legal se liberan al contratar la primera etapa.</p>
                <p>También te explicaremos qué ocurre con la adjudicación judicial y qué adeudos del inmueble podrían subsistir.</p>
                <button class="primary" data-action="open-auth" data-mode="register">Crear cuenta</button>
              </div>
            ` : showFull ? `
              <div class="section-card" style="margin-top:16px;">
                <p><strong>Fecha de subasta:</strong> ${escapeHtml(formatDate(state.propertyDetail.auctionDate))}</p>
                <p><strong>Hora de subasta:</strong> ${escapeHtml(state.propertyDetail.auctionTime || "Pendiente")}</p>
                <p><strong>Órgano subastador:</strong> ${escapeHtml(state.propertyDetail.courtName || "Pendiente")}</p>
                <p><strong>Postura legal:</strong> ${formatMoney(state.propertyDetail.legalBidMxn)}</p>
                <p><strong>Dirección completa:</strong> ${escapeHtml(state.propertyDetail.fullAddress || "")}</p>
                <div class="notice-card">
                  <strong>Adjudicación y adeudos:</strong> la adjudicación judicial permite solicitar la cancelación de gravámenes procedentes y la entrega del inmueble, pero no necesariamente elimina adeudos de agua, predial, luz o mantenimiento.
                </div>
              </div>
            ` : `
              <div class="section-card" style="margin-top:16px;">
                <div class="kicker">Datos visibles en esta etapa</div>
                <p><strong>Fecha de subasta:</strong> ${showDate ? escapeHtml(formatDate(state.propertyDetail.auctionDate)) : "Por confirmar"}</p>
                <p><strong>Postura legal:</strong> ${formatMoney(state.propertyDetail.legalBidMxn)}</p>
                <p>El órgano subastador, la hora, la dirección completa y el detalle legal se desbloquean con la asesoría inicial de ${formatMoney(3000)}. También revisamos posibles adeudos de servicios, predial y mantenimiento antes de que decidas avanzar.</p>
                <div class="inline-actions">
                  ${relatedCase?.progress?.nextStageCode === "ADVISORY" && relatedCase.progress.canPurchaseNextStage
                    ? `<button class="primary" data-action="checkout" data-case-id="${relatedCase.id}" data-stage-code="ADVISORY">Desbloquear asesoría inicial</button>`
                    : `<a class="primary" href="${DASHBOARD_PATH}">Ver este expediente en mi dashboard</a>`}
                </div>
              </div>
            `}
          </div>
          <div>
            <div class="education-video tone-${state.propertyDetail.heroTone || "navy"}">
              <div>
                <div class="play-badge">${state.propertyDetail.discountPct}%</div>
                <h3>${formatMoney(state.propertyDetail.estimatedValueMxn)}</h3>
                <p>${showCourtAndTime ? "Ya tienes visibilidad operativa para esta oportunidad." : "El siguiente paso es desbloquear visibilidad operativa y asesoría."}</p>
              </div>
            </div>
            <div class="inline-actions" style="margin-top:18px;">
              <button class="primary" data-action="interest-property" data-property-id="${state.propertyDetail.id}">${relatedCase ? "Ir a mi expediente" : "Me interesa este inmueble"}</button>
              <button class="ghost" data-action="close-property">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAuth() {
  if (!state.authOpen) {
    return "";
  }

  const isRegister = state.authMode === "register";
  const isLogin = state.authMode === "login";
  const isResetRequest = state.authMode === "reset-request";
  const isResetSent = state.authMode === "reset-sent";
  const isResetConfirm = state.authMode === "reset-confirm";
  const title = isRegister ? "Crear cuenta" : isLogin ? "Entrar a tu dashboard" : "Recuperar contraseña";
  const copy = isRegister
    ? "Crea tu cuenta para guardar inmuebles, consultar fechas y avanzar con acompañamiento por etapas."
    : isLogin
      ? "Inicia sesión para consultar tus expedientes, pagos y mensajes."
      : isResetSent
        ? "Si el correo existe, generamos instrucciones para restablecer tu contraseña."
        : isResetConfirm
          ? "Escribe tu nueva contraseña para volver a entrar a tu dashboard."
          : "Escribe el correo de tu cuenta y te enviaremos instrucciones para restablecer tu contraseña.";
  const authForm = isResetSent ? `
              <div class="notice-card">
                <strong>Solicitud recibida.</strong>
                <p>Revisa tu correo para continuar.</p>
                ${state.passwordResetUrl ? `<a class="primary text-center" href="${escapeHtml(state.passwordResetUrl)}">Abrir enlace de recuperación</a>` : ""}
              </div>
            ` : isResetRequest ? `
              <form class="form-grid" data-form="password-reset-request">
                <input name="email" type="email" placeholder="Correo electrónico" autocomplete="username" required />
                <button class="primary" type="submit">Enviar instrucciones</button>
              </form>
            ` : isResetConfirm ? `
              <form class="form-grid" data-form="password-reset-confirm">
                <div class="password-field">
                  <input name="password" type="${state.authPasswordVisible ? "text" : "password"}" autocomplete="new-password" placeholder="Nueva contraseña" minlength="8" required />
                  <button type="button" class="password-toggle" onclick="window.rematesCliente.toggleAuthPassword(this); return false;" aria-label="${state.authPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}">${state.authPasswordVisible ? "🙈" : "👁"}</button>
                </div>
                <button class="primary" type="submit">Actualizar contraseña</button>
              </form>
            ` : `
              <form class="form-grid" data-form="${state.authMode}">
                ${isRegister ? `
                  <input name="fullName" placeholder="Nombre completo" autocomplete="name" required />
                  <select name="gender" required>
                    <option value="">Cómo prefieres que te demos la bienvenida</option>
                    <option value="FEMALE">Bienvenida</option>
                    <option value="MALE">Bienvenido</option>
                    <option value="UNSPECIFIED">Prefiero un saludo neutral</option>
                  </select>
                ` : ""}
                <input name="email" type="email" placeholder="Correo electrónico" autocomplete="${isLogin ? "username" : "email"}" required />
                ${isRegister ? `<input name="phone" placeholder="Teléfono" autocomplete="tel" />` : ""}
                <div class="password-field">
                  <input name="password" type="${state.authPasswordVisible ? "text" : "password"}" autocomplete="${isLogin ? "current-password" : "new-password"}" placeholder="Contraseña" required />
                  <button type="button" class="password-toggle" onclick="window.rematesCliente.toggleAuthPassword(this); return false;" aria-label="${state.authPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}">${state.authPasswordVisible ? "🙈" : "👁"}</button>
                </div>
                <button class="primary" type="submit">${isLogin ? "Entrar" : "Crear cuenta"}</button>
              </form>
            `;
  const actions = isLogin ? `
              <button type="button" class="ghost" onclick="window.rematesCliente.switchAuth('reset-request'); return false;">Olvidé mi contraseña</button>
              <button type="button" class="ghost" onclick="window.rematesCliente.switchAuth('register'); return false;">Necesito una cuenta</button>
              <button type="button" class="ghost" onclick="window.rematesCliente.closeAuth(); return false;">Cancelar</button>
            ` : isRegister ? `
              <button type="button" class="ghost" onclick="window.rematesCliente.switchAuth('login'); return false;">Ya tengo cuenta</button>
              <button type="button" class="ghost" onclick="window.rematesCliente.closeAuth(); return false;">Cancelar</button>
            ` : `
              <button type="button" class="ghost" onclick="window.rematesCliente.switchAuth('login'); return false;">Ya tengo cuenta</button>
              <button type="button" class="ghost" onclick="window.rematesCliente.closeAuth(); return false;">Cancelar</button>
            `;

  return `
    <div class="auth-backdrop" data-action="close-auth" onclick="window.rematesCliente.closeAuth()">
      <div class="auth-card" data-modal-card="true" onclick="event.stopPropagation()">
        <div class="auth-grid">
          <div>
            <div class="kicker">Acceso seguro</div>
            <h2>${title}</h2>
            <p>${copy}</p>
            ${isLogin || isRegister ? `<div class="inline-actions">
              <button type="button" class="ghost" data-action="social-login" data-provider="google">Continuar con Google</button>
              <button type="button" class="ghost" data-action="social-login" data-provider="facebook">Continuar con Facebook</button>
            </div>` : ""}
          </div>
          <div>
            ${authForm}
            <div class="inline-actions">
              ${actions}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCheckoutModal() {
  if (!state.checkoutPayment) {
    return "";
  }

  const stage = findStage(state.checkoutPayment.stageCode);
  return `
    <div class="auth-backdrop" data-action="close-checkout">
      <div class="auth-card" data-modal-card="true">
        <div class="kicker">Mercado Pago</div>
        <h2>Resumen de pago</h2>
        <p>Revisa la etapa seleccionada y el monto antes de continuar.</p>
        <div class="section-card">
          <p><strong>Etapa:</strong> ${escapeHtml(stage?.title || state.checkoutPayment.stageCode)}</p>
          <p><strong>Monto:</strong> ${formatMoney(state.checkoutPayment.amountMxn)}</p>
          <p><strong>Incluye:</strong> ${escapeHtml(stage?.summary || "Servicio profesional asociado al expediente.")}</p>
        </div>
        <div class="inline-actions">
          <button class="primary" data-action="confirm-checkout" data-payment-id="${state.checkoutPayment.id}">Confirmar pago</button>
          <button class="ghost" data-action="close-checkout">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="footer shell">
      <div class="footer-simple">
        <div class="footer-owner">
          <img src="/assets/legalflow-logo.png" alt="LegalFlow" />
          <span>Esta app pertenece a LegalFlow.</span>
        </div>
        <a class="footer-whatsapp" href="${WHATSAPP_LINK}" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp al 55 1360 0354">
          <span class="whatsapp-icon">${renderWhatsAppIcon()}</span>
          <span class="whatsapp-copy">
            <strong>WhatsApp</strong>
            <small>55 1360 0354</small>
          </span>
        </a>
      </div>
    </footer>
  `;
}

function renderWhatsAppContact() {
  return `
    <a class="whatsapp-float" href="${WHATSAPP_LINK}" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp al 55 1360 0354">
      <span class="whatsapp-float__icon">${renderWhatsAppIcon()}</span>
      <span class="whatsapp-float__copy">
        <span>¿Dudas?</span>
        <strong>Escríbenos por WhatsApp</strong>
        <small>55 1360 0354</small>
      </span>
    </a>
  `;
}

function renderPrivacyNotice() {
  return `
    <section class="section shell privacy-section" id="privacy-notice">
      <details class="privacy-card">
        <summary>
          <span>
            <span class="kicker">LegalFlow, S.A. de C.V.</span>
            <strong>Aviso de privacidad</strong>
          </span>
          <span class="privacy-toggle">Ver aviso completo</span>
        </summary>
        <div class="privacy-copy">
          <p>LegalFlow, S.A. de C.V., con domicilio en Yácatas número 215, Colonia Narvarte Poniente, Alcaldía Benito Juárez, C.P. 03020, Ciudad de México, es responsable de recabar sus datos personales, del uso que se le dé a los mismos y de su debida protección, en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su Reglamento.</p>
          <p>El presente Aviso de Privacidad aplica exclusivamente a los datos personales recabados a través del uso de esta página, así como por la información que el titular proporcione directamente dentro de la misma.</p>

          <h3>Finalidades del tratamiento de los datos personales</h3>
          <p>La información personal que usted proporcione a través de esta página será utilizada para las siguientes finalidades:</p>
          <ul>
            <li>Proveer los servicios y funcionalidades que usted haya solicitado mediante el uso de esta página.</li>
            <li>Dar seguimiento a solicitudes, requerimientos, consultas, elaboración de documentos, análisis o gestiones relacionadas con los servicios ofrecidos.</li>
            <li>Informarle sobre cambios o actualizaciones en los servicios proporcionados.</li>
            <li>Evaluar la calidad del servicio y mejorar la experiencia de usuario.</li>
          </ul>

          <h3>Datos personales recabados</h3>
          <p>Para las finalidades antes mencionadas, podremos recabar los siguientes datos personales:</p>
          <ul>
            <li>Nombre.</li>
            <li>Domicilio.</li>
            <li>Números telefónicos.</li>
            <li>Correo electrónico.</li>
            <li>Información de facturación.</li>
          </ul>
          <p>Los datos personales proporcionados podrán ser considerados como sensibles de conformidad con la Ley aplicable, por lo que LegalFlow, S.A. de C.V. se compromete a tratarlos bajo estrictas medidas de seguridad administrativas, técnicas y físicas.</p>

          <h3>Limitación de uso y divulgación</h3>
          <p>Los datos personales que nos sean proporcionados serán tratados de forma confidencial.</p>
          <p>Asimismo, se hace constar expresamente que la información recabada en esta página únicamente será compartida con el equipo de LegalFlow, S.A. de C.V., para efectos de operación, soporte, cumplimiento de los servicios y mejoras internas.</p>
          <p>Los datos personales proporcionados no serán compartidos con terceros, salvo que:</p>
          <ul>
            <li>Sea necesario por la naturaleza del servicio contratado y el titular lo autorice expresamente.</li>
            <li>Lo exija una autoridad competente mediante mandato debidamente fundado y motivado conforme a la legislación aplicable.</li>
          </ul>

          <h3>Derechos ARCO y revocación del consentimiento</h3>
          <p>Usted tiene derecho de Acceder, Rectificar, Cancelar sus datos personales, así como Oponerse al tratamiento de los mismos (Derechos ARCO), o bien revocar el consentimiento que nos haya otorgado para el tratamiento de su información.</p>
          <p>Para ejercer dichos derechos, será necesario que nos indique por escrito su solicitud, especificando de forma clara su deseo de acceder, rectificar, cancelar u oponerse al tratamiento de sus datos personales, o revocar el consentimiento otorgado.</p>
          <p>Dicha solicitud podrá presentarse en el domicilio señalado anteriormente o enviarse al correo electrónico: <a href="mailto:e.rusconi@intellilaw.ai">e.rusconi@intellilaw.ai</a>.</p>

          <h3>Cambios al aviso de privacidad</h3>
          <p>Cualquier modificación a este Aviso de Privacidad podrá ser consultada en el domicilio antes señalado o solicitada a través del correo electrónico: <a href="mailto:e.rusconi@intellilaw.ai">e.rusconi@intellilaw.ai</a>.</p>
          <p><strong>Fecha de la última actualización:</strong> 15 de enero de 2026.</p>
        </div>
      </details>
    </section>
  `;
}

function renderHome() {
  return `
    ${renderTopbar()}
    ${renderHomeHero()}
    ${renderExplainer()}
    ${renderListings()}
    ${renderEducation()}
    ${renderPrivacyNotice()}
    ${renderFooter()}
    ${renderPropertyDrawer()}
    ${renderAuth()}
    ${renderCheckoutModal()}
    ${renderWhatsAppContact()}
    ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
  `;
}

function renderDashboard() {
  if (!state.me) {
      return `
        ${renderTopbar()}
        ${renderDashboardAccess()}
        ${renderPrivacyNotice()}
        ${renderFooter()}
        ${renderAuth()}
        ${renderWhatsAppContact()}
        ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
      `;
  }

  return `
    ${renderTopbar()}
      ${renderDashboardHero()}
      ${renderDashboardCases()}
        ${renderListings("dashboard-catalog", "Inmuebles disponibles para ti", "El listado muestra avalúo, postura legal, almoneda y fecha de subasta. El órgano subastador, la hora y la dirección completa se desbloquean al contratar la asesoría inicial para un inmueble específico.")}
      ${renderPrivacyNotice()}
      ${renderFooter()}
      ${renderPropertyDrawer()}
      ${renderAuth()}
      ${renderCheckoutModal()}
    ${renderWhatsAppContact()}
    ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
  `;
}

function render() {
  app.innerHTML = isDashboardRoute ? renderDashboard() : renderHome();
}
