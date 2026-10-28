-- Baseline for the existing Chapter 7 tables. Marked applied on the current database;
-- run normally only when creating a new database from scratch.
CREATE TABLE `menu` (
    `menuId` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `isBestSeller` BOOLEAN NOT NULL DEFAULT false,
    `typeId` INTEGER NULL,

    INDEX `typeId`(`typeId`),
    PRIMARY KEY (`menuId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `type` (
    `typeId` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`typeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `menu` ADD CONSTRAINT `menu_ibfk_1` FOREIGN KEY (`typeId`) REFERENCES `type`(`typeId`) ON DELETE RESTRICT ON UPDATE RESTRICT;
