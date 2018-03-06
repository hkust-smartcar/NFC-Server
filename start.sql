CREATE DATABASE tuckshop;
USE tuckshop;

CREATE TABLE transactions (
  id smallint unsigned not null auto_increment,
  user_id smallint unsigned not null,
  product_id smallint unsigned not null,
  bal_change smallint not null,
  traded_at timestamp not null DEFAULT CURRENT_TIMESTAMP,
  checksum int unsigned not null,
  primary key (id)
);

CREATE TABLE stock (
  id smallint unsigned not null auto_increment,
  product_id smallint unsigned not null,
  total_cost decimal(4,1) not null,
  quantity smallint unsigned not null,
  stocked_at timestamp not null DEFAULT CURRENT_TIMESTAMP,
  primary key (id)
);

CREATE TABLE products (
  id smallint unsigned not null auto_increment,
  name char(32) not null,
  price smallint unsigned not null,
  created_at timestamp not null DEFAULT CURRENT_TIMESTAMP,
  primary key (id)
);

CREATE TABLE users (
  id smallint unsigned not null auto_increment,
  name char(32) not null,
  created_at timestamp not null DEFAULT CURRENT_TIMESTAMP,
  primary key (id)
);

INSERT INTO users (name) VALUES
('KINAGI Amrutavarsh'),
('REN Jiming'),
('CHENG Kwan'),
('MAK Ka Hei'),
('YIU Kwok Ting'),
('CHIU Ka Wa'),
('WONG Ka Yiu'),
('YIM Man Chak'),
('HO Ming Tak'),
('TSENG Mu-ruei'),
('LEUNG Pok Man'),
('QIAN Shiyi'),
('CHEUNG Tsz Yan'),
('POON Wing Sze'),
('LI Xuanyi'),
('LAM Yiu Tung'),
('IEONG Zi Liang Jason'),
('LEE Chun Hei'),
('TSE Ho Nam'),
('MAK Kin Wing'),
('CHEUNG Daniel'),
('WONG Yuk Chun');

INSERT INTO products (name, price) VALUES
('Oreo Choco',2),
('Oreo Vanilla',2),
('Ritz Lemon',2),
('Ritz Cheese',2),
('Calbee Grill a Corn',3),
('Calbee Ethnicans Pot',5),
('Lays Sour Cream',5),
('Lays BBQ',5),
('Vita Ceylon LT',3),
('Vitasoy Malted',4);
