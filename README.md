# RAIV STORE · Etapa 1 (tienda conectada a Supabase)

## Qué incluye esta etapa
- Base de datos real (Supabase): productos, categorías, fotos, inventario.
- Panel privado `admin.html` con usuario y contraseña (Supabase Auth).
- Subir varias fotos por producto (cámara o galería) a Supabase Storage.
- Catálogo `index.html` automático: lee los productos publicados, con buscador y categorías.
- Página de cada producto `producto.html?p=nombre-del-producto` con fotos, precio, descripción, cantidad, consulta por WhatsApp y botones de compartir.
- Seguridad RLS: los visitantes solo ven lo publicado; solo tú puedes crear, editar, borrar, cambiar precios o stock.

## Todavía NO incluido (siguientes etapas)
- Vista previa con foto al compartir en WhatsApp/Facebook (necesita una función en servidor, Etapa 2).
- Estadísticas de visitas, clics y compartidos; textos e imágenes promocionales.
- Carrito y gestión de pedidos.

## Pasos que debes hacer tú
1. Crea una cuenta gratis en https://supabase.com y un proyecto nuevo (guarda la contraseña de la base).
2. Supabase > **SQL Editor** > pega todo `supabase/migrations/001_init.sql` > **Run**.
3. Supabase > **Authentication > Users > Add user**: pon tu correo y contraseña (marca “Auto confirm”).
4. Supabase > **Authentication > Sign In / Providers**: desactiva “Allow new users to sign up”.
5. SQL Editor: abre `002_make_me_admin.sql`, cambia `TU_CORREO@ejemplo.com` por tu correo, y **Run**.
6. Supabase > **Settings > API**: copia “Project URL” y la clave **anon public**. Pégalas en `js/config.js`. (Nunca uses la clave `service_role`.)
7. Prueba en tu computadora: en esta carpeta ejecuta `python3 -m http.server 8000` y abre http://localhost:8000/admin.html
8. Entra, crea un producto con foto, ponlo “Publicado” y míralo en http://localhost:8000/
9. Publicar: sube la carpeta completa a Netlify, Vercel o Cloudflare Pages (arrastrar y soltar). En Supabase > Authentication > URL Configuration agrega la dirección final de tu web.

## Cómo probarlo desde el celular
Con tu web ya publicada, abre `tu-dominio/admin.html`, entra, “+ Nuevo producto” > “Tomar foto”.

## Estado de pruebas (honesto)
El código JavaScript fue revisado en sintaxis, pero **no se pudo probar contra un Supabase real** desde aquí. Haz la prueba del paso 8 y avísame de cualquier error exacto.
