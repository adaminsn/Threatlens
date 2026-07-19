-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jul 19, 2026 at 08:32 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `threatlens`
--

-- --------------------------------------------------------

--
-- Table structure for table `badges`
--

CREATE TABLE `badges` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `earned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `threat_id` int NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`id`, `user_id`, `threat_id`, `content`, `created_at`) VALUES
(2, 2, 2, 'masa iya sih', '2026-05-21 09:57:40');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `password_resets`
--

INSERT INTO `password_resets` (`id`, `email`, `token`, `expires_at`, `created_at`) VALUES
(1, 'adaminsaan24@gmail.com', '3f0defc6980942ecaafc73fe9aaaad9d6657effe783b643ed5d0ab2de0839c39', '2026-06-18 11:54:35', '2026-06-18 03:54:34'),
(2, 'adaminsaan24@gmail.com', '6ddf022ba9e584fd102950f3553f5b41785869aa1bc3947b6ff61c4fd25ce139', '2026-06-19 06:58:16', '2026-06-18 22:58:16'),
(3, 'adaminsaan24@gmail.com', 'b4be11a60b9b883e0cfb07819ca0a60c7e7ad7c652c6a9fdc8e9cd72dc4b55d2', '2026-06-19 09:45:00', '2026-06-19 01:45:00'),
(4, 'adaminsaan24@gmail.com', '219f86d8a91887e6feb5c0abdd7407629287aa8bf1d0fbedebfbc2c0313cb278', '2026-06-19 09:54:15', '2026-06-19 01:54:15'),
(5, 'adaminsaan24@gmail.com', '6934a5d52fb21620e68a18cc2ea49f26b5b314cd95cb82a71e5008ac5b7fb7d5', '2026-07-19 16:19:11', '2026-07-19 08:19:11');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int NOT NULL DEFAULT '1',
  `site_name` varchar(255) DEFAULT 'ThreatLens',
  `maintenance_mode` tinyint DEFAULT '0',
  `report_cooldown` int DEFAULT '60',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `site_name`, `maintenance_mode`, `report_cooldown`, `updated_at`) VALUES
(1, 'ThreatLens', 0, 60, '2026-06-13 10:31:01');

-- --------------------------------------------------------

--
-- Table structure for table `threats`
--

CREATE TABLE `threats` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `indicator` varchar(255) NOT NULL,
  `type` enum('url','ip','hash','domain') NOT NULL,
  `category` enum('phishing','malware','ransomware','spam','other') NOT NULL,
  `description` text,
  `status` enum('pending','safe','suspicious','dangerous') DEFAULT 'pending',
  `verified` tinyint(1) DEFAULT '0',
  `virustotal_result` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verification_count` int DEFAULT '0',
  `verification_list` text,
  `vote_score` int DEFAULT '0',
  `vote_count_total` int DEFAULT '0',
  `pending_until` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `threats`
--

INSERT INTO `threats` (`id`, `user_id`, `title`, `indicator`, `type`, `category`, `description`, `status`, `verified`, `virustotal_result`, `created_at`, `verification_count`, `verification_list`, `vote_score`, `vote_count_total`, `pending_until`) VALUES
(2, 3, 'IP yang mencurigakan', '192.168.1.1', 'ip', 'spam', 'banyak traffic yang masuk dari ip tersebut', 'pending', 1, NULL, '2026-05-21 09:55:45', 1, '[3]', 0, 0, NULL),
(6, 2, 'Suspicious Email Attachment', 'invoice_2024.pdf.exe', 'hash', 'malware', 'Email attachment claiming to be invoice but is executable', 'suspicious', 1, NULL, '2026-05-21 12:16:16', 1, '[1]', 0, 0, NULL),
(7, 2, 'Fake Shopping Website', 'shop-disount2024.com', 'url', 'phishing', 'Fake e-commerce site collecting payment info', 'dangerous', 1, NULL, '2026-05-21 12:16:16', 5, '[6,4,5,7,8]', 0, 0, NULL),
(8, 3, 'Ransomware Note', 'README_TO_DECRYPT.txt', 'hash', 'ransomware', 'Ransom note found in encrypted folders', 'dangerous', 0, NULL, '2026-05-21 12:16:16', 0, NULL, 0, 0, NULL),
(10, 3, 'Spam Campaign', 'winner@lottery-intl.com', 'domain', 'spam', 'Fake lottery spam campaign', 'suspicious', 0, NULL, '2026-05-21 12:16:16', 0, NULL, 0, 0, NULL),
(11, 2, 'URL Aneh', 'https://www.roblox.com/home', 'url', 'other', 'Ketika membuka website tersebut, muncul notif atau pop up tidak boleh membuka karena terdapat virus', 'pending', 1, NULL, '2026-05-23 01:23:47', 3, '[1,1,3]', 0, 0, NULL),
(13, 2, 'AI Agent', 'https://www.kimi.com/chat/19e52d9a-7ce2-8cb5-8000-09d6f7bc28f5?chat_enter_method=home', 'url', 'other', 'Aku tidak tau kenapa, tetapi saat saya buka web tersebut menjadi leg sekali dan muncul notif berbahaya', 'safe', 1, '{\"scanned\": true, \"checked_at\": \"2026-05-23T07:21:19.250Z\", \"risk_score\": 0, \"total_engines\": 0, \"malicious_count\": 0, \"suspicious_count\": 0, \"recommended_level\": \"safe\"}', '2026-05-23 07:21:19', 0, NULL, 0, 0, NULL),
(24, 2, 'asdfasd', 'https://www.virustotal.com/gui/my-apikey', 'url', 'malware', 'fasdfasd asdfasdf asdfasdf asdfasdfa asdfasdf asdfasdf', 'dangerous', 1, '{\"scanned\": true, \"checked_at\": \"2026-05-23T11:19:59.105Z\", \"risk_score\": 0, \"total_engines\": 0, \"malicious_count\": 0, \"suspicious_count\": 0, \"recommended_level\": \"safe\"}', '2026-05-23 11:19:59', 5, '[4,5,6,7,8]', 0, 0, NULL),
(28, 19, 'anu', 'https://www.youtube.com/watch?v=M3S2KB6RwwA', 'url', 'malware', 'asdfasdfasdfa sdafsdfasdfa sdaf asdfas dfas dfasd f1234aws dfasd fas', 'safe', 0, '{\"scanned\": true, \"checked_at\": \"2026-06-13T10:02:24.987Z\", \"risk_score\": 0, \"total_engines\": 0, \"malicious_count\": 0, \"suspicious_count\": 0, \"recommended_level\": \"safe\"}', '2026-06-13 10:02:24', 0, NULL, 0, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `threat_verifications`
--

CREATE TABLE `threat_verifications` (
  `id` int NOT NULL,
  `threat_id` int NOT NULL,
  `verifier_id` int NOT NULL,
  `verified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `threat_verifications`
--

INSERT INTO `threat_verifications` (`id`, `threat_id`, `verifier_id`, `verified_at`) VALUES
(1, 11, 3, '2026-05-23 01:54:42'),
(2, 11, 1, '2026-05-23 03:24:11'),
(3, 11, 1, '2026-05-23 03:24:18'),
(4, 6, 1, '2026-05-23 03:33:27'),
(5, 7, 6, '2026-05-23 03:59:43'),
(6, 7, 4, '2026-05-23 05:40:14'),
(7, 7, 5, '2026-05-23 05:40:45'),
(8, 7, 7, '2026-05-23 05:41:13'),
(9, 7, 8, '2026-05-23 05:41:45'),
(10, 13, 1, '2026-05-23 07:53:22'),
(11, 24, 4, '2026-05-23 11:20:23'),
(12, 24, 5, '2026-05-23 11:20:52'),
(13, 24, 6, '2026-05-23 11:21:14'),
(14, 24, 7, '2026-05-23 11:21:33'),
(15, 24, 8, '2026-05-23 11:21:56');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `reputation` int DEFAULT '0',
  `level` int DEFAULT '1',
  `total_points` int DEFAULT '0',
  `xp` int DEFAULT '0',
  `avatar` varchar(500) DEFAULT NULL,
  `bio` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `email_verified` tinyint DEFAULT '0',
  `last_activity_device` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `reputation`, `level`, `total_points`, `xp`, `avatar`, `bio`, `created_at`, `last_activity`, `email_verified`, `last_activity_device`) VALUES
(1, 'admin', 'admin@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 9999, 100, 0, 0, NULL, 'Founder & CEO of ThreatLens. Cybersecurity expert with 15+ years experience.', '2026-05-23 03:07:07', '2026-07-19 07:35:14', 1, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'),
(2, 'testuser', 'test@gmail.com', '$2b$10$JHfEV28yirJubrXgxcBd8eFs0QnumD/iucrwr9J1xjOhZACxF1Zoy', 'user', 353, 4, 0, 0, NULL, 'Security enthusiast learning about threat hunting and malware analysis.', '2026-04-23 22:52:17', '2026-06-13 09:57:06', 0, NULL),
(3, 'adaminsn_', 'adaminsaan24@gmail.com', '$2b$10$NMe7vMih8.i9yA6S4D9nDO1FAVIE88hok2mAWXmpMGCqBcYz/2OlO', 'user', 7010, 71, 0, 0, '/uploads/avatars/user-3-1781348777980-774204498.jpeg', 'this is nine one one, what is your emergency?.', '2026-05-21 03:31:54', '2026-07-19 07:59:34', 1, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'),
(4, 'CyberVanguard', 'cyber@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 8520, 86, 0, 0, NULL, '🏆 Elite Threat Hunter | 5+ years experience', '2026-05-23 03:49:05', '2026-05-23 11:20:21', 0, NULL),
(5, 'NetShield', 'netshield@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 7820, 79, 0, 0, NULL, '🛡️ Network Security Expert', '2026-05-23 03:49:05', '2026-05-23 11:20:50', 0, NULL),
(19, 'lioraa', 'liora@gmail.com', '$2b$10$egJPyfBTdeYtIJu.1abR9uFwaghDV7zG/lo0JilArG94DsPPMw1AW', 'user', 10, 1, 0, 0, NULL, NULL, '2026-06-13 10:00:33', '2026-06-13 10:31:57', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_achievements`
--

CREATE TABLE `user_achievements` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `achievement_type` varchar(50) NOT NULL,
  `achieved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `votes`
--

CREATE TABLE `votes` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `threat_id` int NOT NULL,
  `vote` enum('dangerous','safe') NOT NULL,
  `weight` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `votes`
--

INSERT INTO `votes` (`id`, `user_id`, `threat_id`, `vote`, `weight`, `created_at`) VALUES
(2, 3, 2, 'dangerous', 1, '2026-05-21 09:56:33'),
(3, 2, 2, 'safe', 1, '2026-05-21 09:57:46'),
(12, 3, 6, 'dangerous', 1, '2026-05-21 12:19:42'),
(13, 3, 7, 'dangerous', 1, '2026-05-21 12:19:42'),
(14, 2, 8, 'dangerous', 1, '2026-05-21 12:19:42'),
(16, 2, 10, 'safe', 1, '2026-05-21 12:19:42'),
(17, 3, 11, 'dangerous', 1, '2026-05-23 01:24:21'),
(18, 6, 7, 'dangerous', 1, '2026-05-23 03:52:59'),
(19, 10, 7, 'dangerous', 1, '2026-05-23 03:58:21'),
(20, 5, 7, 'dangerous', 1, '2026-05-23 05:37:07'),
(21, 7, 7, 'dangerous', 1, '2026-05-23 05:41:18'),
(22, 8, 7, 'dangerous', 1, '2026-05-23 05:41:51'),
(23, 2, 7, 'dangerous', 1, '2026-05-23 05:43:24'),
(24, 2, 11, 'safe', 1, '2026-05-23 06:38:13'),
(27, 4, 24, 'dangerous', 1, '2026-05-23 11:20:33'),
(28, 7, 24, 'dangerous', 1, '2026-05-23 11:21:38'),
(29, 8, 24, 'dangerous', 1, '2026-05-23 11:22:00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `badges`
--
ALTER TABLE `badges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `threat_id` (`threat_id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_email` (`email`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `threats`
--
ALTER TABLE `threats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `threat_verifications`
--
ALTER TABLE `threat_verifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `threat_id` (`threat_id`),
  ADD KEY `verifier_id` (`verifier_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_achievements`
--
ALTER TABLE `user_achievements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_achievement` (`user_id`,`achievement_type`);

--
-- Indexes for table `votes`
--
ALTER TABLE `votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_vote` (`user_id`,`threat_id`),
  ADD KEY `threat_id` (`threat_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `badges`
--
ALTER TABLE `badges`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `threats`
--
ALTER TABLE `threats`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `threat_verifications`
--
ALTER TABLE `threat_verifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `user_achievements`
--
ALTER TABLE `user_achievements`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `votes`
--
ALTER TABLE `votes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `badges`
--
ALTER TABLE `badges`
  ADD CONSTRAINT `badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`threat_id`) REFERENCES `threats` (`id`);

--
-- Constraints for table `threats`
--
ALTER TABLE `threats`
  ADD CONSTRAINT `threats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `threat_verifications`
--
ALTER TABLE `threat_verifications`
  ADD CONSTRAINT `threat_verifications_ibfk_1` FOREIGN KEY (`threat_id`) REFERENCES `threats` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `threat_verifications_ibfk_2` FOREIGN KEY (`verifier_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_achievements`
--
ALTER TABLE `user_achievements`
  ADD CONSTRAINT `user_achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `votes`
--
ALTER TABLE `votes`
  ADD CONSTRAINT `votes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `votes_ibfk_2` FOREIGN KEY (`threat_id`) REFERENCES `threats` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
