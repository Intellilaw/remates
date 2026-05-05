INSERT INTO roles (id, code) VALUES
  ('role_client', 'CLIENT'),
  ('role_sales', 'SALES'),
  ('role_legal', 'LEGAL'),
  ('role_finance', 'FINANCE'),
  ('role_content', 'CONTENT'),
  ('role_admin', 'ADMIN');

INSERT INTO service_stages (code, name, sort_order, price_mxn) VALUES
  ('ADVISORY', 'Asesoría personalizada', 1, 3000),
  ('REPRESENTATION', 'Preparación y acompañamiento', 2, 20000),
  ('POSSESSION', 'Obtención de posesión', 3, 70000);

INSERT INTO cms_content (id, content_key, title, body_markdown, video_s3_key, is_published) VALUES
  ('cms_education', 'education', 'Cómo funciona invertir en remates inmobiliarios', 'Analizamos expedientes, explicamos cada etapa y acompañamos a nuestros clientes con información clara.', '', TRUE);
