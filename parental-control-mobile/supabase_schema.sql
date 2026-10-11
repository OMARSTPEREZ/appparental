-- ==============================================================================
-- KIBBO - SEGURIDAD FAMILIAR  |  ESQUEMA RELACIONAL SUPABASE
-- Script corregido: usa TEXT como tipo base para IDs (compatibilidad garantizada)
-- Ejecutar completo en el SQL Editor de Supabase (>_ SQL Editor → New Query → Run)
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 0: Limpiar tablas anteriores con conflictos de tipo
-- (DROP TABLE elimina las políticas, índices y FK asociadas automáticamente)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.notifications_log  CASCADE;
DROP TABLE IF EXISTS public.commands           CASCADE;
DROP TABLE IF EXISTS public.app_rules          CASCADE;
DROP TABLE IF EXISTS public.locations          CASCADE;
DROP TABLE IF EXISTS public.devices            CASCADE;
DROP TABLE IF EXISTS public.children           CASCADE;
DROP TABLE IF EXISTS public.parents            CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1: Extensiones
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2: Tabla de Padres / Administradores
--   id: TEXT para compatibilidad con Supabase Auth UID (string) y IDs demo
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.parents (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  admin_pin   TEXT    DEFAULT '0000',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3: Tabla de Hijos / Dispositivos supervisados
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.children (
  id            TEXT PRIMARY KEY,
  parent_id     TEXT REFERENCES public.parents(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  age           INT,
  pairing_token TEXT UNIQUE,
  is_locked     BOOLEAN DEFAULT false,
  daily_time_limit_minutes  INT DEFAULT 120,
  time_used_today_minutes   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 4: Telemetría del Dispositivo (batería, GPS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.devices (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  child_id      TEXT REFERENCES public.children(id) ON DELETE CASCADE,
  battery_level INT     DEFAULT 100,
  is_gps_on     BOOLEAN DEFAULT true,
  last_seen     TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 5: Historial de Geolocalización GPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.locations (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  child_id   TEXT REFERENCES public.children(id) ON DELETE CASCADE,
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 6: Reglas de Aplicaciones y Horarios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.app_rules (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  child_id            TEXT REFERENCES public.children(id) ON DELETE CASCADE,
  package_name        TEXT NOT NULL,
  app_name            TEXT,
  is_blocked          BOOLEAN DEFAULT false,
  time_limit_minutes  INT     DEFAULT 0,
  schedule_start      TIME,
  schedule_end        TIME,
  UNIQUE (child_id, package_name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 7: Historial de Notificaciones Interceptadas
--   (Este era el que fallaba con UUID vs TEXT — ahora usa TEXT)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.notifications_log (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  child_id    TEXT REFERENCES public.children(id) ON DELETE CASCADE,
  app_name    TEXT,
  title       TEXT,
  message     TEXT,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 8: Bus de Comandos Remotos en Vivo (LOCK, UNLOCK, SOS_ALERT, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.commands (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  child_id     TEXT REFERENCES public.children(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,   -- 'LOCK' | 'UNLOCK' | 'CAM_FRONT' | 'CAM_BACK' | 'START_AUDIO' | 'STOP_AUDIO' | 'SOS_ALERT'
  status       TEXT DEFAULT 'PENDING',
  payload      JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 8b: Zonas Seguras (Geofencing)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.geofences (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  child_id         TEXT REFERENCES public.children(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  latitude         DOUBLE PRECISION NOT NULL,
  longitude        DOUBLE PRECISION NOT NULL,
  radius_meters    INT NOT NULL DEFAULT 200,
  address          TEXT,
  zone_type        TEXT DEFAULT 'home', -- 'home' | 'school' | 'family' | 'other'
  is_alert_enabled BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 9: Activar Supabase Realtime para WebSockets
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.children;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofences;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 10: Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.parents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commands          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences         ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 11: Políticas de acceso (permisivas para desarrollo y demo)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "kibbo_parents_all"            ON public.parents           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "kibbo_children_all"           ON public.children          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "kibbo_devices_all"            ON public.devices           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "kibbo_locations_all"          ON public.locations         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "kibbo_app_rules_all"          ON public.app_rules         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "kibbo_notifications_log_all"  ON public.notifications_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "kibbo_commands_all"           ON public.commands          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "kibbo_geofences_all"          ON public.geofences         FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 12: Datos de demostración inicial
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.parents (id, email, name, admin_pin)
VALUES ('parent_usr_99182', 'padre@kibbo.app', 'Familia Perez', '0000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.children (id, parent_id, name, age, pairing_token, daily_time_limit_minutes, time_used_today_minutes)
VALUES ('child_mateo_01', 'parent_usr_99182', 'Mateo', 12, 'KIBBO-TOKEN-MATEO-2024', 120, 45)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- ✅ Schema de Kibbo - Seguridad Familiar listo y sin conflictos de tipo
-- ─────────────────────────────────────────────────────────────────────────────
