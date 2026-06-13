-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Waktu pembuatan: 13 Jun 2026 pada 08.06
-- Versi server: 8.4.3
-- Versi PHP: 8.3.16

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
-- Struktur dari tabel `badges`
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
-- Struktur dari tabel `comments`
--

CREATE TABLE `comments` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `threat_id` int NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data untuk tabel `comments`
--

INSERT INTO `comments` (`id`, `user_id`, `threat_id`, `content`, `created_at`) VALUES
(2, 2, 2, 'masa iya sih', '2026-05-21 09:57:40');

-- --------------------------------------------------------

--
-- Struktur dari tabel `threats`
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
-- Dumping data untuk tabel `threats`
--

INSERT INTO `threats` (`id`, `user_id`, `title`, `indicator`, `type`, `category`, `description`, `status`, `verified`, `virustotal_result`, `created_at`, `verification_count`, `verification_list`, `vote_score`, `vote_count_total`, `pending_until`) VALUES
(2, 3, 'IP yang mencurigakan', '192.168.1.1', 'ip', 'spam', 'banyak traffic yang masuk dari ip tersebut', 'pending', 1, NULL, '2026-05-21 09:55:45', 1, '[3]', 0, 0, NULL),
(6, 2, 'Suspicious Email Attachment', 'invoice_2024.pdf.exe', 'hash', 'malware', 'Email attachment claiming to be invoice but is executable', 'suspicious', 1, NULL, '2026-05-21 12:16:16', 1, '[1]', 0, 0, NULL),
(7, 2, 'Fake Shopping Website', 'shop-disount2024.com', 'url', 'phishing', 'Fake e-commerce site collecting payment info', 'dangerous', 1, NULL, '2026-05-21 12:16:16', 5, '[6,4,5,7,8]', 0, 0, NULL),
(8, 3, 'Ransomware Note', 'README_TO_DECRYPT.txt', 'hash', 'ransomware', 'Ransom note found in encrypted folders', 'dangerous', 0, NULL, '2026-05-21 12:16:16', 0, NULL, 0, 0, NULL),
(10, 3, 'Spam Campaign', 'winner@lottery-intl.com', 'domain', 'spam', 'Fake lottery spam campaign', 'suspicious', 0, NULL, '2026-05-21 12:16:16', 0, NULL, 0, 0, NULL),
(11, 2, 'URL Aneh', 'https://www.roblox.com/home', 'url', 'other', 'Ketika membuka website tersebut, muncul notif atau pop up tidak boleh membuka karena terdapat virus', 'pending', 1, NULL, '2026-05-23 01:23:47', 3, '[1,1,3]', 0, 0, NULL),
(13, 2, 'AI Agent', 'https://www.kimi.com/chat/19e52d9a-7ce2-8cb5-8000-09d6f7bc28f5?chat_enter_method=home', 'url', 'other', 'Aku tidak tau kenapa, tetapi saat saya buka web tersebut menjadi leg sekali dan muncul notif berbahaya', 'safe', 1, '{\"scanned\": true, \"checked_at\": \"2026-05-23T07:21:19.250Z\", \"risk_score\": 0, \"total_engines\": 0, \"malicious_count\": 0, \"suspicious_count\": 0, \"recommended_level\": \"safe\"}', '2026-05-23 07:21:19', 0, NULL, 0, 0, NULL),
(24, 2, 'asdfasd', 'https://www.virustotal.com/gui/my-apikey', 'url', 'malware', 'fasdfasd asdfasdf asdfasdf asdfasdfa asdfasdf asdfasdf', 'dangerous', 1, '{\"scanned\": true, \"checked_at\": \"2026-05-23T11:19:59.105Z\", \"risk_score\": 0, \"total_engines\": 0, \"malicious_count\": 0, \"suspicious_count\": 0, \"recommended_level\": \"safe\"}', '2026-05-23 11:19:59', 5, '[4,5,6,7,8]', 0, 0, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `threat_verifications`
--

CREATE TABLE `threat_verifications` (
  `id` int NOT NULL,
  `threat_id` int NOT NULL,
  `verifier_id` int NOT NULL,
  `verified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data untuk tabel `threat_verifications`
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
-- Struktur dari tabel `users`
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
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `reputation`, `level`, `total_points`, `xp`, `avatar`, `bio`, `created_at`, `last_activity`) VALUES
(1, 'admin', 'admin@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 9999, 100, 0, 0, NULL, 'Founder & CEO of ThreatLens. Cybersecurity expert with 15+ years experience.', '2026-05-23 03:07:07', '2026-06-05 03:06:50'),
(2, 'testuser', 'test@gmail.com', '$2b$10$JHfEV28yirJubrXgxcBd8eFs0QnumD/iucrwr9J1xjOhZACxF1Zoy', 'user', 353, 4, 0, 0, NULL, 'Security enthusiast learning about threat hunting and malware analysis.', '2026-04-23 22:52:17', '2026-06-05 06:50:33'),
(3, 'adaminsn_', 'adaminsaan24@gmail.com', '$2b$10$NMe7vMih8.i9yA6S4D9nDO1FAVIE88hok2mAWXmpMGCqBcYz/2OlO', 'admin', 7010, 71, 0, 0, '/uploads/avatars/user-3-1779361776159-464816607.jpeg', 'this is nine one one, what is your emergency?.', '2026-05-21 03:31:54', '2026-06-05 03:08:45'),
(4, 'CyberVanguard', 'cyber@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 8520, 86, 0, 0, NULL, '🏆 Elite Threat Hunter | 5+ years experience', '2026-05-23 03:49:05', '2026-05-23 11:20:21'),
(5, 'NetShield', 'netshield@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 7820, 79, 0, 0, NULL, '🛡️ Network Security Expert', '2026-05-23 03:49:05', '2026-05-23 11:20:50'),
(6, 'DarkTrace', 'darktrace@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 7220, 73, 0, 0, NULL, '🔍 Advanced Threat Detection', '2026-05-23 03:49:05', '2026-05-23 11:21:11'),
(7, 'MalwareKiller', 'malwarekiller@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 6820, 69, 0, 0, NULL, '🦠 Malware Analyst', '2026-05-23 03:49:05', '2026-05-23 11:21:31'),
(8, 'PhishFinder', 'phishfinder@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 6586, 66, 0, 0, NULL, '🎣 Phishing Specialist', '2026-05-23 03:49:05', '2026-05-23 11:40:26'),
(9, 'DDoSDefender', 'ddosdefender@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 6000, 60, 0, 0, NULL, '⚔️ DDoS Mitigation Expert', '2026-05-23 03:49:05', '2026-05-23 03:49:05'),
(10, 'ZeroDayHunter', 'zeroday@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 5500, 55, 0, 0, NULL, '💀 Zero Day Vulnerability Hunter', '2026-05-23 03:49:05', '2026-05-23 03:58:08'),
(11, 'RansomStop', 'ransomstop@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 5200, 52, 0, 0, NULL, '🔒 Ransomware Fighter', '2026-05-23 03:49:05', '2026-05-23 03:51:10'),
(12, 'SecurityRookie', 'rookie@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 4500, 45, 0, 0, NULL, '🔰 Security Enthusiast', '2026-05-23 03:49:05', '2026-05-23 03:49:05'),
(13, 'BugHunter', 'bug@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 3800, 38, 0, 0, NULL, '🐛 Bug Bounty Hunter', '2026-05-23 03:49:05', '2026-05-23 03:49:05'),
(14, 'PacketSniffer', 'packet@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 3000, 30, 0, 0, NULL, '📡 Network Analyst', '2026-05-23 03:49:05', '2026-05-23 03:49:05'),
(15, 'FirewallGuard', 'firewall@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 2500, 25, 0, 0, NULL, '🔥 Firewall Administrator', '2026-05-23 03:49:05', '2026-05-23 03:49:05'),
(16, 'LogWatcher', 'logwatcher@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1800, 18, 0, 0, NULL, '📋 Log Monitoring', '2026-05-23 03:49:05', '2026-05-23 03:49:05'),
(17, 'NewHunter', 'newhunter@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 1000, 10, 0, 0, NULL, '🌱 Beginner Threat Hunter', '2026-05-23 03:49:05', '2026-05-23 03:49:05'),
(18, 'JustJoined', 'justjoined@threatlens.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 500, 5, 0, 0, NULL, '✨ New Member', '2026-05-23 03:49:06', '2026-05-23 03:49:06');

-- --------------------------------------------------------

--
-- Struktur dari tabel `user_achievements`
--

CREATE TABLE `user_achievements` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `achievement_type` varchar(50) NOT NULL,
  `achieved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `votes`
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
-- Dumping data untuk tabel `votes`
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
-- Indeks untuk tabel `badges`
--
ALTER TABLE `badges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `threat_id` (`threat_id`);

--
-- Indeks untuk tabel `threats`
--
ALTER TABLE `threats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `threat_verifications`
--
ALTER TABLE `threat_verifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `threat_id` (`threat_id`),
  ADD KEY `verifier_id` (`verifier_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indeks untuk tabel `user_achievements`
--
ALTER TABLE `user_achievements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_achievement` (`user_id`,`achievement_type`);

--
-- Indeks untuk tabel `votes`
--
ALTER TABLE `votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_vote` (`user_id`,`threat_id`),
  ADD KEY `threat_id` (`threat_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `badges`
--
ALTER TABLE `badges`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `comments`
--
ALTER TABLE `comments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `threats`
--
ALTER TABLE `threats`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT untuk tabel `threat_verifications`
--
ALTER TABLE `threat_verifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT untuk tabel `user_achievements`
--
ALTER TABLE `user_achievements`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `votes`
--
ALTER TABLE `votes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `badges`
--
ALTER TABLE `badges`
  ADD CONSTRAINT `badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Ketidakleluasaan untuk tabel `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`threat_id`) REFERENCES `threats` (`id`);

--
-- Ketidakleluasaan untuk tabel `threats`
--
ALTER TABLE `threats`
  ADD CONSTRAINT `threats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Ketidakleluasaan untuk tabel `threat_verifications`
--
ALTER TABLE `threat_verifications`
  ADD CONSTRAINT `threat_verifications_ibfk_1` FOREIGN KEY (`threat_id`) REFERENCES `threats` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `threat_verifications_ibfk_2` FOREIGN KEY (`verifier_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `user_achievements`
--
ALTER TABLE `user_achievements`
  ADD CONSTRAINT `user_achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `votes`
--
ALTER TABLE `votes`
  ADD CONSTRAINT `votes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `votes_ibfk_2` FOREIGN KEY (`threat_id`) REFERENCES `threats` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
