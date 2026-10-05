-- A small minicms database in mysqldump's format, for e2e/import.mjs. Made up for the test.
DROP TABLE IF EXISTS `pages`;
CREATE TABLE `pages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `slug` varchar(255) NOT NULL,
  `slug_en` varchar(255) DEFAULT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_title_en` varchar(255) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `meta_description_en` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `pages` VALUES (1,'درباره ما','About us','درباره-ما','about-us','درباره‌ی استودیو','About the studio','داستان ما','Our story'),(2,'خدمات','Services','خدمات','services',NULL,NULL,NULL,NULL);

DROP TABLE IF EXISTS `page_details`;
CREATE TABLE `page_details` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `page_id` bigint(20) unsigned NOT NULL,
  `sort` bigint(20) unsigned NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `content_en` text DEFAULT NULL,
  `kind` varchar(25) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `page_details` (`id`, `page_id`, `sort`, `name`, `content`, `content_en`, `kind`) VALUES (1,1,2,'side','{\"side_side_title\":\"<p>سال تجربه<\\/p>\",\"side_side_big_title\":\"12\",\"side_side_first_lines\":\"خط اول &amp; دوم\",\"side_side_second_lines\":null,\"side_side_third_lines\":null,\"side_side_btn_name\":\"تماس\",\"side_side_btn_url\":\"\\/page\\/services\",\"side_side_1_img\":\"images\\/pages\\/side.jpg\"}','{\"side_side_title_en\":\"<p>Years of work<\\/p>\",\"side_side_big_title_en\":\"12\",\"side_side_first_lines_en\":\"First line &amp; more\",\"side_side_btn_name_en\":\"Contact\",\"side_side_btn_url\":\"\\/page\\/services\",\"side_side_1_img\":\"images\\/pages\\/side.jpg\"}','4'),(2,1,1,'top','{\"triple_title\":\"کارهای ما\",\"triple_1_name\":\"معماری\",\"triple_1_description\":\"<div>خانه‌ها<br>و دفترها<\\/div>\",\"triple_1_url\":\"#a\",\"triple_1_img\":\"images\\/pages\\/one.jpg\",\"triple_2_name\":\"داخلی\",\"triple_2_img\":\"images\\/pages\\/two.jpg\",\"triple_3_name\":\"باغ\",\"triple_3_img\":\"images\\/pages\\/missing.jpg\"}','{\"triple_title_en\":\"Our work\",\"triple_1_name_en\":\"Architecture\",\"triple_1_description_en\":\"<div>Houses<br>and offices<\\/div>\",\"triple_2_name_en\":\"Interiors\",\"triple_3_name_en\":\"Gardens\"}','2'),(3,1,3,'free','{\"editor_form_title\":\"<p>متن <strong>آزاد<\\/strong><\\/p>\"}','{\"editor_form_title_en\":\"<p>Free <strong>text<\\/strong><\\/p>\"}','9'),(4,2,1,'grid','{\"grid\":[{\"image\":\"images\\/pages\\/one.jpg\",\"title\":\"یک\",\"description\":\"اول\",\"btn_link\":\"#1\"},{\"image\":\"images\\/pages\\/two.jpg\",\"title\":\"دو\",\"description\":\"دوم\",\"btn_link\":\"\"}],\"grid_size\":\"2*2\",\"grid_size_mobile\":\"2*1\"}','{\"grid_en\":[{\"image\":\"images\\/pages\\/one.jpg\",\"title\":\"One\",\"description\":\"First\",\"btn_link\":\"#1\"},{\"image\":\"images\\/pages\\/two.jpg\",\"title\":\"Two\",\"description\":\"Second\",\"btn_link\":\"\"}],\"grid_size\":\"2*2\"}','12'),(5,2,2,'odd','{}','{}','99');

DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `image` text NOT NULL,
  `tags` text NOT NULL,
  `description` longtext NOT NULL,
  `shortDescription` longtext NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `posts` VALUES (1,1,'سلام دنیا','hello-world','images/pages/one.jpg','خبر، استودیو','<p>متن کامل</p>','خلاصه');
