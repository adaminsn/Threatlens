-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Waktu pembuatan: 23 Bulan Mei 2026 pada 07.03
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
(9, 3, 'C2 Server Detected', '185.130.5.253', 'ip', 'malware', 'Command and control server for botnet', 'dangerous', 0, NULL, '2026-05-21 12:16:16', 0, NULL, 0, 0, NULL),
(10, 3, 'Spam Campaign', 'winner@lottery-intl.com', 'domain', 'spam', 'Fake lottery spam campaign', 'suspicious', 0, NULL, '2026-05-21 12:16:16', 0, NULL, 0, 0, NULL),
(11, 2, 'URL Aneh', 'https://www.roblox.com/home', 'url', 'other', 'Ketika membuka website tersebut, muncul notif atau pop up tidak boleh membuka karena terdapat virus', 'pending', 1, NULL, '2026-05-23 01:23:47', 3, '[1,1,3]', 0, 0, NULL);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `threats`
--
ALTER TABLE `threats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `threats`
--
ALTER TABLE `threats`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `threats`
--
ALTER TABLE `threats`
  ADD CONSTRAINT `threats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
