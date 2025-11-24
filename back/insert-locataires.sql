-- ============================================================================
-- Script SQL pour créer des locataires de test dans WAMP/phpMyAdmin
-- ============================================================================
-- Exécutez ce script AVANT d'insérer les conventions
-- ============================================================================

-- Insérer des locataires de test
INSERT INTO locataire (codeCli, nomcli, datenais, lieunais, pere, mere, cin, delivcin, adressecli, activite) VALUES
(1, 'RAKOTO Jean', '1985-05-15', 'Fianarantsoa', 'RAKOTO Paul', 'RAVAO Marie', '101234567890', '2015-03-20', 'Lot IIC123', 'Commerçant'),
(2, 'RASOA Sophie', '1990-07-22', 'Ambositra', 'RASOA Michel', 'RAVAO Jeanne', '101234567891', '2018-03-10', 'Lot IIC456', 'Enseignante'),
(3, 'RAHARIJAONA Pierre', '1982-11-05', 'Ambalavao', 'RAHARIJAONA Jean', 'RASOAMANANA Louise', '101234567892', '2016-09-15', 'Tanambao', 'Fonctionnaire'),
(4, 'RASOANIRINA Nicole', '1988-05-18', 'Fianarantsoa', 'RASOANIRINA Georges', 'RAKOTOMALALA Anne', '101234567893', '2017-12-08', 'Mahazoari', 'Infirmière'),
(5, 'ANDRIANASOLO Daniel', '1975-09-30', 'Manakara', 'ANDRIANASOLO Thomas', 'RAZAFINDRA Catherine', '101234567894', '2014-05-25', 'Bvd France', 'Médecin'),
(6, 'RAJAONAH Hortense', '1992-01-12', 'Fianarantsoa', 'RAJAONAH Albert', 'RAVELO Sylvie', '101234567895', '2019-02-14', 'Ankadifot', 'Avocate'),
(7, 'RAKOTONDRAZAKA Claude', '1980-08-27', 'Ihosy', 'RAKOTONDRAZAKA François', 'RASOLONJATOVO Martine', '101234567896', '2015-11-30', 'RN7 Ihosy', 'Ingénieur'),
(8, 'RAMANANTSOA Elisabeth', '1987-12-03', 'Fianarantsoa', 'RAMANANTSOA Henri', 'RABENATOANDRO Alice', '101234567897', '2018-07-19', 'Andranome', 'Pharmacienne');

-- Vérifier les locataires créés
SELECT codeCli, nomcli, cin, activite FROM locataire ORDER BY codeCli DESC LIMIT 10;

