import { hashPassword, randomId } from "../utils/security.js";

const serviceStages = [
  {
    code: "ADVISORY",
    name: "Asesoría personalizada",
    sortOrder: 1,
    priceMxn: 3000,
    description: "Desbloquea órgano subastador y hora de la almoneda, además de una asesoría personalizada para entender el expediente, la postura legal, los posibles costos posteriores y los siguientes pasos."
  },
  {
    code: "REPRESENTATION",
    name: "Preparación y acompañamiento",
    sortOrder: 2,
    priceMxn: 20000,
    description: "Incluye preparación, acompañamiento a la audiencia, compra del billete de depósito y recuperación del billete si el inmueble no te es adjudicado."
  },
  {
    code: "POSSESSION",
    name: "Obtención de posesión",
    sortOrder: 3,
    priceMxn: 70000,
    description: "Disponible solo después de la adjudicación. Acompañamos el trámite para impulsar la entrega y posesión del inmueble conforme a lo ordenado por el juez."
  }
];

const demoUsers = [
  {
    id: "usr_client_demo",
    email: "cliente@remates.mx",
    password: "Demo123!",
    fullName: "Mariana Robles",
    gender: "FEMALE",
    phone: "+52 55 1000 2000",
    status: "ACTIVE",
    roles: ["CLIENT"]
  },
  {
    id: "usr_sales_demo",
    email: "asesor@remates.mx",
    password: "Demo123!",
    fullName: "Javier Mendoza",
    gender: "MALE",
    phone: "+52 55 2000 3000",
    status: "ACTIVE",
    roles: ["SALES"]
  },
  {
    id: "usr_legal_demo",
    email: "legal@remates.mx",
    password: "Demo123!",
    fullName: "Patricia Salas",
    gender: "FEMALE",
    phone: "+52 55 3000 4000",
    status: "ACTIVE",
    roles: ["LEGAL"]
  },
  {
    id: "usr_admin_demo",
    email: "e.rusconi@rusconi.law",
    password: "Whisky37$",
    fullName: "Eduardo Rusconi",
    gender: "UNSPECIFIED",
    phone: "",
    status: "ACTIVE",
    roles: ["ADMIN", "FINANCE", "CONTENT"]
  }
];

const demoProperties = [
  {
    id: "prop_polanco_001",
    slug: "departamento-polanco-horacio",
    title: "Departamento en Polanco",
    state: "Ciudad de México",
    city: "Miguel Hidalgo",
    zoneLabel: "Polanco IV Sección",
    estimatedValueMxn: 7200000,
    legalBidMxn: 4392000,
    discountPct: 39,
    auctionRound: "PRIMERA",
    shortDescription: "Departamento de 180 m2 con acceso controlado y potencial alto de plusvalía.",
    fullAddress: "Horacio 1732, Polanco IV Sección, Miguel Hidalgo, CDMX",
    auctionDate: "2026-05-12",
    auctionTime: "11:30",
    courtName: "Juzgado Décimo Segundo de lo Civil de la Ciudad de México",
    occupancyStatus: "Ocupado",
    legalSummary: "Juicio hipotecario en etapa avanzada, expediente revisado y con cronología validada.",
    riskNotes: "Revisar estado procesal, estrategia de posesión y posibles adeudos de predial, agua, energía eléctrica o mantenimiento antes de pujar.",
    publicStatus: "PUBLISHED",
    featured: true,
    tags: ["CDMX", "Residencial", "Alta plusvalía"],
    heroTone: "navy",
    imageAccent: "#1d4ed8"
  },
  {
    id: "prop_delvalle_002",
    slug: "departamento-del-valle-norte",
    title: "Departamento en Del Valle Norte",
    state: "Ciudad de México",
    city: "Benito Juárez",
    zoneLabel: "Del Valle Norte",
    estimatedValueMxn: 4950000,
    legalBidMxn: 3267000,
    discountPct: 34,
    auctionRound: "SEGUNDA",
    shortDescription: "Departamento bien ubicado con expediente atractivo para inversión patrimonial en CDMX.",
    fullAddress: "Parroquia 815, Del Valle Norte, Benito Juárez, CDMX",
    auctionDate: "2026-06-03",
    auctionTime: "10:00",
    courtName: "Juzgado Noveno de lo Civil de la Ciudad de México",
    occupancyStatus: "Desocupado",
    legalSummary: "Proceso con revisión documental preliminar y trazabilidad suficiente para acompañamiento en subasta.",
    riskNotes: "Confirmar tiempos de escrituración, adeudos asociados al inmueble y disponibilidad del expediente completo.",
    publicStatus: "PUBLISHED",
    featured: true,
    tags: ["CDMX", "Benito Juárez", "Desocupado"],
    heroTone: "cobalt",
    imageAccent: "#2563eb"
  },
  {
    id: "prop_coyoacan_003",
    slug: "casa-coyoacan-santa-catarina",
    title: "Casa en Coyoacán",
    state: "Ciudad de México",
    city: "Coyoacán",
    zoneLabel: "Santa Catarina",
    estimatedValueMxn: 3800000,
    legalBidMxn: 2698000,
    discountPct: 29,
    auctionRound: "POSTERIOR",
    shortDescription: "Casa con vocación patrimonial en una de las zonas con mayor demanda residencial de CDMX.",
    fullAddress: "Fernández Leal 101, Santa Catarina, Coyoacán, CDMX",
    auctionDate: "2026-04-25",
    auctionTime: "09:45",
    courtName: "Juzgado Quinto de lo Civil de la Ciudad de México",
    occupancyStatus: "Ocupado",
    legalSummary: "Remate con valor comercial competitivo y viabilidad para estrategia de largo plazo.",
    riskNotes: "La posesión puede requerir tiempo adicional. Revisar estatus procesal y posibles adeudos de servicios o contribuciones.",
    publicStatus: "PUBLISHED",
    featured: false,
    tags: ["CDMX", "Coyoacán", "Patrimonial"],
    heroTone: "sky",
    imageAccent: "#60a5fa"
  },
  {
    id: "prop_narvarte_004",
    slug: "departamento-narvarte-poniente",
    title: "Departamento en Narvarte Poniente",
    state: "Ciudad de México",
    city: "Benito Juárez",
    zoneLabel: "Narvarte Poniente",
    estimatedValueMxn: 5100000,
    legalBidMxn: 3468000,
    discountPct: 32,
    auctionRound: "SEGUNDA",
    shortDescription: "Departamento con conectividad sobresaliente y descuento competitivo frente a mercado abierto.",
    fullAddress: "Anaxágoras 822, Narvarte Poniente, Benito Juárez, CDMX",
    auctionDate: "2026-06-18",
    auctionTime: "12:15",
    courtName: "Juzgado Décimo Sexto de lo Civil de la Ciudad de México",
    occupancyStatus: "Ocupado",
    legalSummary: "Expediente atractivo para compradores que buscan entrada controlada al mercado de remates en CDMX.",
    riskNotes: "Verificar tiempos de entrega, costos posteriores a la adjudicación y adeudos que no se extinguen por la adjudicación.",
    publicStatus: "PUBLISHED",
    featured: false,
    tags: ["CDMX", "Benito Juárez", "Conectividad"],
    heroTone: "navy",
    imageAccent: "#1e40af"
  },
  {
    id: "prop_condesa_005",
    slug: "departamento-condesa-amsterdam",
    title: "Departamento en Condesa",
    state: "Ciudad de México",
    city: "Cuauhtémoc",
    zoneLabel: "Hipódromo Condesa",
    estimatedValueMxn: 3600000,
    legalBidMxn: 2628000,
    discountPct: 27,
    auctionRound: "PRIMERA",
    shortDescription: "Unidad compacta con demanda de renta alta y buen punto de entrada para inversionistas.",
    fullAddress: "Amsterdam 211, Hipódromo Condesa, Cuauhtémoc, CDMX",
    auctionDate: "2026-05-30",
    auctionTime: "13:00",
    courtName: "Juzgado Séptimo de lo Civil de la Ciudad de México",
    occupancyStatus: "Desocupado",
    legalSummary: "Caso apto para compradores que priorizan ubicación y potencial de renta sobre tamaño.",
    riskNotes: "Revisar mantenimiento, condominio, predial, servicios y costos notariales antes de avanzar de etapa.",
    publicStatus: "PUBLISHED",
    featured: false,
    tags: ["CDMX", "Condesa", "Inversión"],
    heroTone: "cobalt",
    imageAccent: "#3b82f6"
  }
];

function buildAuthUsers() {
  return demoUsers.map((user) => {
    const { salt, hash } = hashPassword(user.password);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      gender: user.gender,
      status: user.status,
      roles: user.roles,
      salt,
      passwordHash: hash,
      createdAt: "2026-03-01T12:00:00.000Z"
    };
  });
}

export function createSeedData() {
  const users = buildAuthUsers();
  const primaryCaseId = "case_demo_001";
  const primaryConversationId = "conv_demo_001";
  const firstPaymentId = "pay_demo_001";

  return {
    serviceStages,
    users,
    authIdentities: [
      { id: randomId("auth"), userId: "usr_client_demo", provider: "email", providerSubject: "cliente@remates.mx" },
      { id: randomId("auth"), userId: "usr_sales_demo", provider: "email", providerSubject: "asesor@remates.mx" },
      { id: randomId("auth"), userId: "usr_legal_demo", provider: "email", providerSubject: "legal@remates.mx" },
      { id: randomId("auth"), userId: "usr_admin_demo", provider: "email", providerSubject: "e.rusconi@rusconi.law" }
    ],
    properties: demoProperties.map((property, index) => ({
      ...property,
      publishedAt: `2026-03-${String(index + 2).padStart(2, "0")}T12:00:00.000Z`
    })),
    cases: [
      {
        id: primaryCaseId,
        userId: "usr_client_demo",
        propertyId: "prop_polanco_001",
        status: "ACTIVE",
        currentStage: "ADVISORY",
        assignedStaffUserId: "usr_sales_demo",
        leadSource: "organic_search",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "remates-polanco-q2",
        createdAt: "2026-03-10T15:10:00.000Z",
        lastActivityAt: "2026-03-15T18:00:00.000Z"
      }
    ],
    caseEvents: [
      {
        id: randomId("evt"),
        caseId: primaryCaseId,
        eventType: "CASE_CREATED",
        actorUserId: "usr_client_demo",
        metadata: { source: "organic_search" },
        createdAt: "2026-03-10T15:10:00.000Z"
      },
      {
        id: randomId("evt"),
        caseId: primaryCaseId,
          eventType: "PAYMENT_APPROVED",
          actorUserId: "usr_admin_demo",
          metadata: { stageCode: "ADVISORY", paymentId: firstPaymentId },
        createdAt: "2026-03-12T11:45:00.000Z"
      }
    ],
    payments: [
      {
        id: firstPaymentId,
        caseId: primaryCaseId,
        stageCode: "ADVISORY",
        provider: "mercado_pago",
        amountMxn: 3000,
        currency: "MXN",
        status: "APPROVED",
        providerPreferenceId: "pref_demo_001",
        providerPaymentId: "mp_demo_approved_001",
        checkoutUrl: "#mock-approved",
        paidAt: "2026-03-12T11:45:00.000Z",
        createdAt: "2026-03-12T11:10:00.000Z"
      }
    ],
    paymentWebhookEvents: [],
    passwordResetTokens: [],
    conversations: [
      {
        id: primaryConversationId,
        caseId: primaryCaseId,
        status: "OPEN",
        lastMessageAt: "2026-03-15T18:00:00.000Z"
      }
    ],
    conversationParticipants: [
      { conversationId: primaryConversationId, userId: "usr_client_demo", participantType: "CLIENT" },
      { conversationId: primaryConversationId, userId: "usr_sales_demo", participantType: "STAFF" }
    ],
    messages: [
      {
        id: randomId("msg"),
        conversationId: primaryConversationId,
        senderUserId: "usr_client_demo",
        body: "Hola, me interesa revisar el expediente completo y entender cómo sería la etapa de posesión.",
        createdAt: "2026-03-15T17:40:00.000Z",
        readAt: "2026-03-15T17:45:00.000Z"
      },
      {
        id: randomId("msg"),
        conversationId: primaryConversationId,
        senderUserId: "usr_sales_demo",
        body: "Claro. Ya tienes desbloqueada la asesoría inicial. Tu expediente quedó listo para seguimiento legal.",
        createdAt: "2026-03-15T18:00:00.000Z",
        readAt: null
      }
    ],
    internalNotes: [
      {
        id: randomId("note"),
        caseId: primaryCaseId,
        authorUserId: "usr_legal_demo",
        body: "Validar cronología del juzgado antes de sugerir avance a preparación.",
        createdAt: "2026-03-15T16:00:00.000Z"
      }
    ],
    cmsContent: [
        {
          id: "cms_education",
          contentKey: "education",
          title: "Qué es un remate inmobiliario y cómo lo acompañamos en CDMX",
          bodyMarkdown: "Un remate inmobiliario es una subasta derivada de un procedimiento judicial. Si el inmueble se adjudica, la transmisión deriva de una resolución del juez, quien puede ordenar la cancelación de gravámenes procedentes y la entrega al adjudicatario. Aun así, la adjudicación no necesariamente elimina adeudos de agua, predial, energía eléctrica o cuotas de mantenimiento, por lo que deben revisarse y presupuestarse por separado.",
          videoS3Key: "",
          isPublished: true
        }
    ],
    visitorSessions: [
      {
        id: "visit_demo_001",
        anonymousId: "anon_demo_001",
        referrer: "https://www.google.com/",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "remates-polanco-q2",
        startedAt: "2026-03-10T14:55:00.000Z",
        lastSeenAt: "2026-03-10T15:15:00.000Z"
      }
    ],
    conversionEvents: [
      {
        id: randomId("conv"),
        visitorSessionId: "visit_demo_001",
        userId: null,
        caseId: null,
        propertyId: "prop_polanco_001",
        eventType: "visit",
        metadata: { source: "landing" },
        createdAt: "2026-03-10T14:56:00.000Z"
      },
      {
        id: randomId("conv"),
        visitorSessionId: "visit_demo_001",
        userId: "usr_client_demo",
        caseId: primaryCaseId,
        propertyId: "prop_polanco_001",
        eventType: "payment_approved",
        metadata: { stageCode: "ADVISORY" },
        createdAt: "2026-03-12T11:45:00.000Z"
      }
    ],
    auditLogs: []
  };
}
