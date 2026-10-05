-- ====================================================================
-- ESTRUCTURA SQL PURO: Email Database Cleaner & Categorizer
-- Compatible con PostgreSQL y SQLite
-- ====================================================================

-- 1. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id VARCHAR(36) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Correos
CREATE TABLE IF NOT EXISTS correos (
    id VARCHAR(36) PRIMARY KEY,
    categoria_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    original_email VARCHAR(255) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('VALIDO', 'GENERICO_ROL', 'INVALIDO')),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Personal', 'Corporativo', 'De_Rol')),
    dominio VARCHAR(255) NOT NULL,
    observacion TEXT NOT NULL,
    mx_valido BOOLEAN DEFAULT FALSE,
    corregido BOOLEAN DEFAULT FALSE,
    score_confianza INT DEFAULT 0 CHECK (score_confianza BETWEEN 0 AND 100),
    verificado_externo BOOLEAN DEFAULT FALSE,
    fuente_verificacion VARCHAR(100) DEFAULT 'Local',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categoria
        FOREIGN KEY (categoria_id) 
        REFERENCES categorias(id) 
        ON DELETE CASCADE,
    CONSTRAINT uq_categoria_email 
        UNIQUE (categoria_id, email)
);

-- 3. Índices para optimización de consultas, filtros y reportes
CREATE INDEX IF NOT EXISTS idx_correos_categoria ON correos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_correos_estado ON correos(estado);
CREATE INDEX IF NOT EXISTS idx_correos_score ON correos(score_confianza);
CREATE INDEX IF NOT EXISTS idx_correos_tipo ON correos(tipo);
CREATE INDEX IF NOT EXISTS idx_correos_dominio ON correos(dominio);
