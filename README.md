# Intellilaw Subastas

Primera versión funcional de una plataforma para publicar, vender y operar subastas inmobiliarias en México.

Esta entrega incluye:
- Sitio público con catálogo, detalle limitado y contenido educativo
- Dashboard de cliente con expedientes, pagos por etapa y mensajería con staff
- Intranet para operación interna con usuarios, casos, notas, contenido e inmuebles
- App móvil/PWA para fotografiar edictos, extraer datos de subasta, confirmar y publicar inmuebles
- Backend API con RBAC y autorización por fila
- Esquema PostgreSQL para RDS y configuración base para AWS
- Datos demo listos para explorar localmente

## Arquitectura de la v1

### Frontend
- `apps/web`: sitio público y dashboard del cliente
- `apps/admin`: intranet del equipo interno
- `apps/mobile`: captura móvil para alta automática de subastas desde fotografía
- En esta preview las apps se sirven desde el backend para simplificar la ejecución local.
- En AWS se sirven detrás del backend en ECS para mantener el contrato actual de rutas y API.

### Backend
- `apps/api`: servidor HTTP en Node.js con rutas JSON, auth demo, control de acceso y lógica de negocio
- Preparado para correr en `ECS Fargate`
- Rutas separadas por dominio en `apps/api/src/routes/api`
- Helpers de autorización, snapshots y reglas compartidas en `apps/api/src/domain`

### Datos
- `prisma/schema.prisma`: esquema relacional objetivo para PostgreSQL en RDS
- `prisma/migrations`: migraciones versionadas para producción
- `apps/api/src/data/runtime-db.json`: almacenamiento demo local generado automáticamente

## Seguridad aplicada en esta v1
- No hay acceso directo a base de datos desde frontend
- Todas las decisiones pasan por API
- Tokens firmados con HMAC
- Passwords con PBKDF2
- RBAC por rol y autorización por fila en backend
- Notas internas ocultas para clientes
- Webhooks de Mercado Pago aislados en endpoint de backend
- Variables sensibles preparadas en `.env.example`

## Ejecución local

### Opción rápida
```powershell
node apps/api/src/server.js
```

La app quedará disponible en:
- Sitio público: [http://localhost:3000](http://localhost:3000)
- Intranet: [http://localhost:3000/admin](http://localhost:3000/admin)
- Captura móvil: [http://localhost:3000/mobile](http://localhost:3000/mobile)

### Resetear datos demo
```powershell
node apps/api/src/data/store.js --reset
```

## Credenciales demo

### Cliente
- `cliente@subastas.mx`
- `Demo123!`

### Ventas
- `asesor@subastas.mx`
- `Demo123!`

### Legal
- `legal@subastas.mx`
- `Demo123!`

### Admin
- `e.rusconi@rusconi.law`
- `Demo123!`

## Flujos incluidos

### Público
- Navegar listado de inmuebles
- Ver detalle limitado
- Consumir contenido educativo
- CTA para iniciar sesión y ver información completa

### Cliente
- Registro o login
- Login social demo con Google/Facebook
- Marcar inmueble de interés
- Abrir expediente por inmueble
- Ver detalle completo y progreso del caso
- Generar pago por etapa
- Confirmar pago en modo demo
- Chatear con staff

### Staff / Intranet
- Ver overview de negocio
- Consultar usuarios y revenue
- Gestionar expedientes
- Cambiar status y etapa
- Agregar notas internas
- Responder mensajes
- Crear inmuebles
- Publicar / destacar inmuebles
- Editar contenido educativo

### Captura móvil de subastas
- Login con cuenta interna `CONTENT`, `LEGAL` o `ADMIN`
- Carga de foto desde cámara o galería
- Extracción por visión usando `OPENAI_API_KEY` y `OPENAI_EXTRACTION_MODEL`
- Confirmación y edición de juzgado, avalúo, postura legal, fecha y dirección
- Cálculo automático de postura legal como 2/3 del avalúo cuando el edicto no la incluye
- Publicación directa en el catálogo web como `PUBLISHED`

## Mercado Pago

La app soporta dos modos:
- `MERCADO_PAGO_MODE=mock`: flujo demo local, sin salir del sistema
- `MERCADO_PAGO_MODE=mercadopago`: intenta crear preferencias reales usando `MERCADO_PAGO_ACCESS_TOKEN`

Webhook disponible:
- `POST /api/payments/webhook/mercadopago`

## Autenticación

### Modo local
- `AUTH_MODE=demo`
- Email/password local
- Botones sociales demo para explorar la UX

### Modo AWS recomendado
- `AUTH_MODE=cognito`
- Configurar Hosted UI de Cognito con Google y Facebook
- Variables necesarias:
  - `COGNITO_DOMAIN`
  - `COGNITO_CLIENT_ID`
  - `COGNITO_REDIRECT_URI`

## Despliegue en AWS

### Recomendación
- `apps/web` -> bucket S3 + distribución CloudFront
- `apps/admin` -> bucket S3 + distribución CloudFront independiente
- `apps/api` -> contenedor en ECS Fargate detrás de ALB
- `prisma/migrations` -> PostgreSQL en RDS
- documentos, video y media -> bucket S3 privado o mixto según activo
- secretos -> AWS Secrets Manager
- observabilidad -> CloudWatch
- protección perimetral -> WAF + HTTPS con ACM

### Infra base incluida
Archivo: [infra/terraform/main.tf](/C:/Users/edrus/Dropbox/2%20Intellilaw/Remates/infra/terraform/main.tf)
Guía: [docs/AWS_DEPLOYMENT.md](/C:/Users/edrus/Dropbox/2%20Intellilaw/Remates/docs/AWS_DEPLOYMENT.md)

Incluye una base para:
- VPC
- subnets públicas y privadas
- ALB
- ECS cluster
- RDS PostgreSQL
- ECR
- Secrets Manager
- CloudWatch logs
- ACM para HTTPS

## Estructura del proyecto

- `apps/api/src/server.js`: API, auth, pagos, casos, admin y serving local
- `apps/api/src/routes/api`: módulos de rutas por dominio
- `apps/api/src/data`: adapters de persistencia local y Prisma/RDS
- `apps/web/index.html`: frontend público y dashboard
- `apps/admin/index.html`: intranet staff
- `prisma/schema.prisma`: esquema PostgreSQL vía Prisma
- `infra/terraform/main.tf`: despliegue AWS base

## Limitaciones conscientes de esta v1
- El chat usa polling, no WebSockets
- Los pagos locales son mock; la integración real depende de credenciales activas
- El almacenamiento local demo usa JSON; la persistencia productiva es PostgreSQL en RDS
- El provider social en local es demo; en producción debe reemplazarse por Cognito Hosted UI u otro IdP definido
- No hay worker dedicado todavía; webhooks se reciben directo en la API

## Próximos pasos recomendados
- Migrar el backend demo a NestJS o Fastify con módulos formales
- Evolucionar los repositorios de datos para usar operaciones incrementales por entidad
- Agregar subida real de archivos a S3 con URLs firmadas
- Añadir pipeline CI/CD para publicar imágenes en ECR y aplicar migraciones
- Añadir pruebas automáticas de API y autorización
