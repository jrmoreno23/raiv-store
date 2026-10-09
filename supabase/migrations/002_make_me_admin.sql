-- Ejecuta esto DESPUÉS de crear tu usuario en Supabase > Authentication > Users.
-- Cambia el correo por el que usaste al crear el usuario.
insert into public.admins (user_id)
select id from auth.users where email = 'morenojair188@gmail.com'
on conflict do nothing;
