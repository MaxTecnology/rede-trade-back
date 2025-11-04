UPDATE "Usuarios"
SET "tipo" = 'Agencia Master'
WHERE "tipo" = 'Franquia Master';

UPDATE "Usuarios"
SET "tipo" = 'Agencia Comum'
WHERE "tipo" IN ('Franquia Comum', 'Franquia Filial');

UPDATE "Conta"
SET "nomeFranquia" = REPLACE("nomeFranquia", 'Franquia', 'Agencia')
WHERE "nomeFranquia" LIKE '%Franquia%';
