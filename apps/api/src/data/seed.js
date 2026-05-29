import { hashPassword, randomId } from "../utils/security.js";

const serviceStages = [
  {
    code: "ADVISORY",
    name: "Asesoría personalizada",
    sortOrder: 1,
    priceMxn: 3000,
    description: "Desbloquea órgano subastador y revisión guiada, además de una asesoría personalizada para entender el expediente, la postura legal, los posibles costos posteriores y los siguientes pasos."
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

const testProperty = {
  id: "prop_test_single_001",
  displayId: "Prueba 001",
  slug: "inmueble-prueba-controlado-cdmx",
  title: "Inmueble de prueba",
  state: "Ciudad de México",
  city: "Benito Juárez",
  zoneLabel: "Narvarte Poniente",
  estimatedValueMxn: 4200000,
  legalBidMxn: 2940000,
  discountPct: 30,
  auctionRound: "PRIMERA",
  shortDescription: "Ficha única de prueba para validar el comportamiento del catálogo y el flujo de detalle.",
  fullAddress: "Calle de prueba 123, Narvarte Poniente, Benito Juárez, Ciudad de México",
  auctionDate: "2026-06-15",
  auctionTime: "10:30",
  courtName: "Juzgado de prueba para validación interna",
  occupancyStatus: "Por confirmar",
  legalSummary: "Registro temporal usado únicamente para revisar el comportamiento de la página.",
  riskNotes: "No usar esta ficha para operación comercial. Debe reemplazarse por un inmueble real antes de publicar formalmente.",
  publicStatus: "PUBLISHED",
  featured: true,
  tags: ["Prueba", "CDMX", "Validación"],
  heroTone: "cobalt",
  imageAccent: "#2563eb",
  publishedAt: "2026-05-26T21:00:00.000Z"
};

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

  return {
    serviceStages,
    users,
    authIdentities: [
      { id: randomId("auth"), userId: "usr_client_demo", provider: "email", providerSubject: "cliente@remates.mx" },
      { id: randomId("auth"), userId: "usr_sales_demo", provider: "email", providerSubject: "asesor@remates.mx" },
      { id: randomId("auth"), userId: "usr_legal_demo", provider: "email", providerSubject: "legal@remates.mx" },
      { id: randomId("auth"), userId: "usr_admin_demo", provider: "email", providerSubject: "e.rusconi@rusconi.law" }
    ],
    properties: [testProperty],
    cases: [],
    caseEvents: [],
    payments: [],
    paymentWebhookEvents: [],
    passwordResetTokens: [],
    conversations: [],
    conversationParticipants: [],
    messages: [],
    internalNotes: [],
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
    visitorSessions: [],
    conversionEvents: [],
    auditLogs: []
  };
}
