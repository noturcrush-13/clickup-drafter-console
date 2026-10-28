# ClickUp Drafter Console

Web console pribadi untuk menyiapkan update mingguan ClickUp. Pemakai: satu orang (PIC Minetech & System, PT Berau Coal). Demo: **Jumat 30 Oktober 2026**. Ini sprint dua hari, jadi utamakan alur yang jalan end-to-end daripada fitur tambahan.

## Cara sistem bekerja

1. Web (repo ini, Next.js di Vercel) mengatur: week, activity yang di-update, matriks sumber per activity, gaya penulisan, dan kontrol n8n.
2. Semua pengaturan disimpan di Supabase.
3. n8n di laptop pengguna menarik job dari tabel `jobs` tiap menit, mengumpulkan bahan, lalu meminta draf ke **agent Hermes "drafter"** (profile Hermes yang SOUL.md-nya berisi standar pic-project-resume, model DeepSeek). Hasilnya disimpan ke tabel `drafts`. **Web tidak pernah memanggil n8n atau Hermes langsung** (keduanya hanya ada di localhost).
4. Pengguna review dan menyetujui draf di web; server web yang menulis ke ClickUp.

## Stack dan aturan keamanan (wajib)

- Next.js App Router, TypeScript strict. Boleh Tailwind. UI dalam Bahasa Indonesia.
- Deploy di Vercel Hobby. Seluruh web dikunci dengan **Vercel Authentication** (Deployment Protection). **Jangan membuat login di dalam aplikasi.**
- Supabase **hanya diakses dari server** (server components, server actions, route handlers) memakai service role key lewat `@supabase/supabase-js`: `createClient(url, key, { auth: { persistSession: false } })`. Modul klien Supabase diawali `import "server-only"`.
- **Tidak ada environment variable berawalan `NEXT_PUBLIC_`.** Tidak ada kunci yang boleh masuk bundle browser.
- **Jangan pernah membaca, menampilkan, atau mencetak isi `.env`, `.env.local`, atau file `.env.*` lain.** Jangan menulis nilai kunci ke log.
- Validasi semua input dari form/route dengan zod.
- **Jangan mengubah skema database.** Tabel sudah ada. Kalau butuh perubahan, tulis SQL-nya dan minta persetujuan.
- Jangan `git push`, menghapus file di luar tugas, atau memasang dependensi besar tanpa bertanya.
- Sebelum menyatakan selesai: jalankan `npm run lint` dan `npm run build`, perbaiki error-nya.

### Environment variable

| Nama | Isi |
| --- | --- |
| `SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
| `CLICKUP_TOKEN` | Personal API token ClickUp (`pk_...`) |
| `CLICKUP_FOLDER_ID` | Folder tempat list "Week NN" (kemungkinan `901813840720`, folder "1. Project Management") |
| `FATHOM_API_KEY` | API key Fathom |

Buat `.env.example` berisi nama variabel saja (tanpa nilai).

## Database Supabase (sudah ada, region ap-southeast-2)

RLS aktif di semua tabel tanpa policy; hanya service role yang bisa akses.

- **`weeks`**: `id uuid`, `iso_year int`, `iso_week int`, `start_date date`, `end_date date`, `clickup_list_id text`, `clickup_list_name text`, `created_at`. Unik `(iso_year, iso_week)`.
- **`activities`**: `id uuid`, `week_id → weeks`, `clickup_task_id text`, `name text`, `project text` (**berisi Divisi**, dari field ClickUp "7. Divisi"; nama kolom tidak diubah), `assignee_names text`, `assigned_to_me bool`, `selected bool`, `style_mode text ('saya'|'ikuti')`, `style_source_task_id text`, `sort_order int`, `created_at`, `updated_at`. Unik `(week_id, clickup_task_id)`.
- **`activity_sources`**: `id uuid`, `activity_id → activities`, `source_type text ('fathom'|'mom'|'slide'|'tracker'|'clickup_prev')`, `enabled bool`, `params jsonb`, `updated_at`. Unik `(activity_id, source_type)`. Bentuk `params`: fathom `{ "keywords": ["IKK","izin kerja khusus"] }`, mom `{ "doc_id": "..." }`, slide `{ "slide_id": "..." }`, tracker `{ "tab": "..." }`, clickup_prev `{}`.
- **`settings`** (satu baris, `id = 1`): `auto_run bool`, `style_rules jsonb` (array teks **aturan tambahan** dari PIC, awalnya kosong; aturan utama ada di SOUL.md agent Hermes), `output_format text` (tidak dipakai), `guide_source text`, `secret_keywords text` (regex dipisah `|`), `token_budget_per_run int`, `notify_email text`, `web_base_url text`, `pic_lead_field_id text`, `pic_lead_option_id text`, `pic_lead_name text`, `updated_at`.
- **`jobs`**: `id uuid`, `week_id → weeks`, `job_type text ('susun_draf')`, `status text ('antri'|'jalan'|'selesai'|'gagal')`, `trigger_source text ('manual'|'jadwal')`, `requested_at`, `started_at`, `finished_at`, `error text`.
- **`drafts`**: `id uuid`, `job_id → jobs`, `activity_id → activities`, `last_accomplishment`, `next_to_do`, `hambatan`, `perlu_dicek`, `sumber` (semua text), `status text ('draf'|'lewati'|'gagal_ai'|'disetujui'|'terkirim'|'gagal_kirim')`, `input_hash text`, `sent_at`, `clickup_result jsonb`, `created_at`, `updated_at`. Riwayat: draf yang ditampilkan adalah yang terbaru per activity.

## Fakta ClickUp

- API v2: `https://api.clickup.com/api/v2`, header `Authorization: <CLICKUP_TOKEN>` (tanpa kata Bearer).
- Setiap minggu ada list baru bernama **"Week NN"** di folder `CLICKUP_FOLDER_ID`. Cari lewat `GET /folder/{id}/list`, cocokkan nama dengan regex tidak peka huruf besar `^\s*week\s*0?NN\b`.
- Task per list: `GET /list/{id}/task?include_closed=true&page=N` (maks. 100 per halaman, ulangi sampai kosong). Task dibuat baru setiap minggu, jadi "isi minggu lalu" = task bernama sama di list week sebelumnya.
- Custom field (ID sama di semua list):

| Field | ID | Tipe | Dipakai untuk |
| --- | --- | --- | --- |
| 1a. PIC Lead Activity | `e77a8ae0-1deb-4ea9-af5e-4f8d5d926bdc` | drop_down | Penanda "milik saya": sama dengan `settings.pic_lead_option_id` (opsi "Aldi") |
| 7. Divisi | `a9c9ee16-6044-4c9d-a789-bce6999e3c00` | drop_down | Dibaca saat sinkron, disimpan ke `activities.project`, ditampilkan sebagai kolom "Divisi" (mis. SMT, MOS) |
| 5. Last Accomplishment | `5bb72a96-67c6-4e6c-9362-2fc11be3ae4b` | text | Ditulis saat disetujui |
| 6. Next To Do | `efd9e44d-3288-4151-90a8-ae5949d3dd2c` | text | Ditulis saat disetujui |
| Hambatan | `a1674788-c6ce-4f92-8a1a-d87dc6cbf623` | text | Ditulis saat disetujui |
| date updated | `c1038c43-487b-4a9d-8b13-a161f40782d1` | **text** | Ditulis saat disetujui, format **"29 Oktober 2026"** (nama bulan Indonesia, tanggal WITA). Format ISO pernah ditolak. |

- Nilai drop_down di respons task bisa berupa `orderindex` (angka) atau id opsi (string). Cocokkan lewat `type_config.options` pada field yang sama, dan tangani kedua bentuk.
- **Jangan pernah menulis** `Status update`, `Date update`, `RYG Status`, field `%` apa pun, `AI_Feedback`, atau field lain di luar tabel di atas. `Status update` dihitung otomatis oleh rule ClickUp.
- Tulis field: `POST /task/{task_id}/field/{field_id}` body `{ "value": "..." }`.
- Komentar arsip: `POST /task/{task_id}/comment` body `{ "comment_text": "...", "notify_all": false }`. Isi: baris judul `Arsip update Week NN · <tanggal> · PIC: <settings.pic_lead_name>`, lalu tiga bagian Last Accomplishment, Next To Do, Hambatan persis seperti yang ditulis ke field.

## Waktu

Week = minggu ISO, Senin 00.00 sampai Minggu 23.59 **WITA (UTC+8)**. Hitung week berjalan dari waktu WITA, bukan waktu server Vercel (UTC). Identitas week di URL: `2026-W44`.

## Halaman

Tampilan mengikuti mockup yang sudah disetujui: sidebar navy `#1F3A5F`, aksi utama teal `#0F766E`, font Inter. Di layar sempit sidebar menjadi navigasi bawah, tabel matriks menjadi kartu per activity, dan target sentuh minimal 44 px. Teks UI Bahasa Indonesia.

### B1 (kerjakan sekarang)

1. **`/`** redirect ke week berjalan, misalnya `/week/2026-W44`.
2. **Week & activity** `/week/[week]`
   - Pemilih week (sebelumnya / berikutnya) dan rentang tanggalnya.
   - Tombol **Sinkron dari ClickUp** (server action): cari list "Week NN", ambil semua task, upsert `weeks` dan `activities`. `assigned_to_me` dihitung dari field 1a. Saat insert pertama, `selected = assigned_to_me`; saat sinkron ulang, **jangan menimpa** `selected` yang sudah diubah pengguna.
   - Activity baru menyalin `style_mode` dan `activity_sources` dari activity bernama sama di week sebelumnya. Kalau tidak ada, buat default: `fathom` aktif dengan keyword kosong, `clickup_prev` aktif, sisanya mati.
   - Tabel activity dengan checkbox (simpan langsung), nama task, divisi, nama PIC 1a, label "Milik saya". Filter: Semua / Milik saya / Dipilih.
   - Pesan jelas bila list "Week NN" tidak ditemukan.
3. **Matriks** `/week/[week]/matriks`
   - Hanya activity `selected`. Kolom: Gaya (`saya` / `ikuti`), Fathom (toggle + keyword dipisah koma), MoM (toggle + URL/ID Google Docs, ambil ID dari URL), Slide (toggle + URL/ID Google Slides), Tracker (toggle + nama tab), ClickUp lalu (toggle). Simpan per baris.
   - **Panel kontrol n8n**: toggle `settings.auto_run`, tombol **Jalankan sekarang** yang membuat baris `jobs` (`week_id`, `status = 'antri'`, `trigger_source = 'manual'`). Tolak bila sudah ada job `antri`/`jalan` untuk week itu. Tampilkan status job terakhir dan perbarui tiap 5 detik lewat route handler `GET /api/jobs/latest?week=...`.
4. **Pengaturan** `/pengaturan`
   - Edit `style_rules` dengan label **"Aturan tambahan untuk agent"** (satu aturan per baris; contoh: koreksi yang berulang dari PIC), `secret_keywords`, `notify_email`, `web_base_url`. Tampilkan `pic_lead_name` dan `guide_source` sebagai info. Jangan tampilkan `output_format`.

### E1 (nanti, jangan dikerjakan sebelum diminta)

- **Review** `/week/[week]/review`: draf terbaru per activity terpilih, edit tiga field, tampilkan `perlu_dicek` dan `sumber`, tombol Setujui / Lewati / Setujui semua.
- Setujui: tulis 3 field + `date updated`, lalu komentar arsip; status `terkirim` atau `gagal_kirim` dengan detail di `clickup_result`. Lewati: status `lewati`.

## Cara kerja dengan pengguna

- Pengguna sedang belajar. Jelaskan singkat apa yang dibuat dan kenapa di setiap langkah, dalam Bahasa Indonesia.
- Mulai setiap tugas dengan rencana singkat (file yang akan dibuat atau diubah) dan tunggu persetujuan.
- Commit kecil per fitur dengan pesan yang jelas.
