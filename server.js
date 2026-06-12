
/**
 * প্রতিষ্ঠান: আবদুর রাজ্জাক দাখিল মাদ্রাসা
 * ঠিকানা: মীরেরখীল, সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম । স্থাপিত: ২০১৮
 * অ্যাডমিন: raisulislamsaied@gmail.com
 * এই ফাইলে এক্সপ্রেস সার্ভার, SQLite ডাটাবেজ এবং ফ্রন্টএন্ড UI (Auto PDF সহ) রয়েছে।
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// মিডলওয়্যার
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ==========================================
// ১. ডাটাবেজ সেটআপ (Real SQLite Database)
// ==========================================
const db = new sqlite3.Database(path.join(__dirname, 'madrasah_recruitment.db'), (err) => {
    if (err) console.error("Database opening error: ", err);
    else console.log("Real SQLite Database Connected.");
});

db.serialize(() => {
    // সার্কুলার টেবিল
    db.run(`CREATE TABLE IF NOT EXISTS circulars (
        id TEXT PRIMARY KEY,
        designation TEXT,
        education TEXT,
        vacancy TEXT,
        age_limit TEXT,
        salary TEXT,
        deadline TEXT,
        active BOOLEAN
    )`);

    // আবেদন টেবিল
    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        circular_id TEXT,
        designation TEXT,
        candidate_name TEXT,
        father_name TEXT,
        mother_name TEXT,
        dob TEXT,
        mobile TEXT,
        photo TEXT,
        signature TEXT,
        apply_date TEXT,
        admit_status TEXT DEFAULT 'Pending',
        exam_date TEXT,
        exam_time TEXT,
        exam_venue TEXT,
        result_status TEXT DEFAULT 'Pending',
        result_marks TEXT
    )`);
});

// অ্যাডমিন ক্রেডেনশিয়ালস
const ADMIN_EMAIL = "raisulislamsaied@gmail.com";
const ADMIN_PASS = "saied783";

// ==========================================
// ২. ব্যাকএন্ড API রাউট সমূহ
// ==========================================

// লগইন API
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        const token = crypto.createHash('sha256').update(ADMIN_EMAIL + ADMIN_PASS).digest('hex');
        return res.json({ success: true, token });
    }
    return res.status(401).json({ success: false, message: "ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়!" });
});

// মিডলওয়্যার: অ্যাডমিন চেক
function adminAuth(req, res, next) {
    const token = req.headers.authorization;
    const expectedToken = crypto.createHash('sha256').update(ADMIN_EMAIL + ADMIN_PASS).digest('hex');
    if (token === expectedToken) next();
    else res.status(403).json({ success: false, message: "অ্যাডমিন প্যানেলে প্রবেশের অনুমতি নেই!" });
}

// সার্কুলার API (Get & Post)
app.get('/api/circulars', (req, res) => {
    db.all("SELECT * FROM circulars ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/circulars', adminAuth, (req, res) => {
    const { designation, education, vacancy, age_limit, salary, deadline } = req.body;
    const id = "CIRC-" + Date.now().toString().slice(-4); // ইউনিক আইডি
    const stmt = db.prepare("INSERT INTO circulars VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    stmt.run(id, designation, education, vacancy, age_limit || '১৮-৩০ বছর', salary || 'আলোচনা সাপেক্ষে', deadline, true, function(err) {
        if (err) return res.status(500).json({ success: false, message: "ডাটাবেজ এরর!" });
        res.json({ success: true, message: "সার্কুলার সফলভাবে তৈরি হয়েছে!" });
    });
    stmt.finalize();
});

// আবেদন জমা দেওয়ার API
app.post('/api/applications', (req, res) => {
    const d = req.body;
    const appId = "ARDM-" + Date.now().toString().slice(-5);
    const applyDate = new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`INSERT INTO applications 
        (id, circular_id, designation, candidate_name, father_name, mother_name, dob, mobile, photo, signature, apply_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
    stmt.run(appId, d.circular_id, d.designation, d.candidate_name, d.father_name, d.mother_name, d.dob, d.mobile, d.photo, d.signature, applyDate, function(err) {
        if (err) return res.status(500).json({ success: false, message: "আবেদন জমা দিতে সমস্যা হয়েছে।" });
        res.json({ success: true, applicationId: appId });
    });
    stmt.finalize();
});

// সিঙ্গেল আবেদন খোঁজা (প্রবেশপত্র ও কপির জন্য)
app.get('/api/applications/:id', (req, res) => {
    db.get("SELECT * FROM applications WHERE id = ?", [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ success: false });
        res.json(row);
    });
});

// অ্যাডমিন: সব আবেদন দেখা
app.get('/api/admin/applications', adminAuth, (req, res) => {
    db.all("SELECT * FROM applications ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// অ্যাডমিন: প্রবেশপত্র ইস্যু
app.post('/api/admin/admit-card', adminAuth, (req, res) => {
    const { id, exam_date, exam_time, exam_venue } = req.body;
    db.run("UPDATE applications SET admit_status = 'Generated', exam_date = ?, exam_time = ?, exam_venue = ? WHERE id = ?", 
        [exam_date, exam_time, exam_venue, id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// অ্যাডমিন: রেজাল্ট প্রকাশ
app.post('/api/admin/publish-result', adminAuth, (req, res) => {
    const { id, status, marks } = req.body;
    db.run("UPDATE applications SET result_status = ?, result_marks = ? WHERE id = ?", 
        [status, marks, id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});


// ==========================================
// ৩. ফ্রন্টএন্ড অ্যাপ্লিকেশন (HTML + JS)
// ==========================================
app.get('*', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>নিয়োগ পোর্টাল - আবদুর রাজ্জাক দাখিল মাদ্রাসা</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- HTML2PDF Library for Automatic PDF Download -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');
        body { font-family: 'Hind Siliguri', sans-serif; background-color: #f0fdf4; }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <!-- Header Section -->
    <header class="bg-emerald-800 text-white shadow-xl">
        <div class="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
            <div class="flex items-center space-x-3 mb-4 md:mb-0">
                <i class="fa fa-mosque text-3xl text-emerald-200"></i>
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold">আবদুর রাজ্জাক দাখিল মাদ্রাসা</h1>
                    <p class="text-sm text-emerald-200">মীরেরখীল, সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম ।</p>
                </div>
            </div>
            <nav class="flex gap-2 flex-wrap justify-center">
                <button onclick="navigate('home')" class="px-4 py-2 hover:bg-emerald-700 rounded font-bold"><i class="fa fa-home"></i> হোম</button>
                <button onclick="navigate('admit-portal')" class="px-4 py-2 hover:bg-emerald-700 rounded font-bold"><i class="fa fa-id-card"></i> প্রবেশপত্র</button>
                <button onclick="navigate('result-portal')" class="px-4 py-2 hover:bg-emerald-700 rounded font-bold"><i class="fa fa-poll"></i> ফলাফল</button>
                <!-- ADMIN PANEL BUTTON MADE VERY VISIBLE -->
                <button id="admin-nav-btn" onclick="navigate('admin-login')" class="px-5 py-2 bg-red-600 hover:bg-red-700 rounded font-bold shadow-lg animate-pulse border-2 border-white"><i class="fa fa-user-shield"></i> অ্যাডমিন প্যানেল</button>
                <button id="logout-btn" onclick="logout()" class="hidden px-5 py-2 bg-red-700 hover:bg-red-800 rounded font-bold"><i class="fa fa-sign-out-alt"></i> লগআউট</button>
            </nav>
        </div>
    </header>

    <main class="flex-grow container mx-auto px-4 py-8">
        
        <!-- ১. হোম (সার্কুলার লিস্ট) -->
        <section id="view-home" class="view">
            <div class="bg-white rounded shadow border border-emerald-200">
                <div class="bg-emerald-700 text-white px-4 py-3"><h2 class="text-xl font-bold">চলমান নিয়োগ বিজ্ঞপ্তি</h2></div>
                <div id="circulars-list" class="p-6 space-y-4"></div>
            </div>
        </section>

        <!-- ২. আবেদন ফর্ম -->
        <section id="view-apply" class="view hidden">
            <div class="max-w-4xl mx-auto bg-white p-6 rounded shadow border border-emerald-200">
                <h2 class="text-2xl font-bold text-emerald-800 mb-6 border-b pb-2">আবেদন ফরম</h2>
                <form id="recruitment-form" onsubmit="submitApplication(event)" class="space-y-4">
                    <input type="hidden" id="form-circular-id">
                    
                    <div class="bg-gray-100 p-3 rounded font-bold text-emerald-900">পদের নাম: <span id="form-designation-display"></span></div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="block font-bold">প্রার্থীর নাম</label><input type="text" id="c_name" required class="w-full border p-2 rounded"></div>
                        <div><label class="block font-bold">পিতার নাম</label><input type="text" id="f_name" required class="w-full border p-2 rounded"></div>
                        <div><label class="block font-bold">মাতার নাম</label><input type="text" id="m_name" required class="w-full border p-2 rounded"></div>
                        <div><label class="block font-bold">জন্ম তারিখ</label><input type="date" id="dob" required class="w-full border p-2 rounded"></div>
                        <div><label class="block font-bold">মোবাইল নাম্বার</label><input type="text" id="mobile" required class="w-full border p-2 rounded"></div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mt-4 border p-4 bg-emerald-50 rounded">
                        <div>
                            <label class="block font-bold mb-2">প্রার্থীর ছবি আপলোড</label>
                            <input type="file" id="photo-input" accept="image/*" required onchange="previewFile('photo-input', 'photo-preview')">
                            <img id="photo-preview" class="mt-2 w-24 h-24 border object-cover hidden">
                        </div>
                        <div>
                            <label class="block font-bold mb-2">স্বাক্ষর আপলোড</label>
                            <input type="file" id="sig-input" accept="image/*" required onchange="previewFile('sig-input', 'sig-preview')">
                            <img id="sig-preview" class="mt-2 w-32 h-10 border object-contain hidden">
                        </div>
                    </div>

                    <button type="submit" class="w-full bg-emerald-700 text-white py-3 rounded font-bold text-lg shadow-lg hover:bg-emerald-800">আবেদন সাবমিট করুন</button>
                </form>
            </div>
        </section>

        <!-- ৩. আবেদন কপি (অটোমেটিক পিডিএফ) -->
        <section id="view-applicant-copy" class="view hidden">
            <div class="text-center mb-4">
                <button onclick="downloadAsPDF('pdf-applicant-area', 'Applicant_Copy.pdf')" class="bg-red-600 text-white px-6 py-3 rounded font-bold shadow hover:bg-red-700 text-lg">
                    <i class="fa fa-file-pdf"></i> আবেদন কপিটি PDF ডাউনলোড করুন
                </button>
                <p class="text-sm text-gray-600 mt-2">উপরের বাটনে ক্লিক করলে অটোমেটিক আপনার ফোনে/পিসিতে PDF সেভ হয়ে যাবে।</p>
            </div>

            <!-- PDF Area -->
            <div id="pdf-applicant-area" class="max-w-2xl mx-auto bg-white p-8 border border-gray-300 shadow">
                <div class="text-center border-b-2 border-emerald-800 pb-4 mb-4">
                    <h2 class="text-2xl font-bold text-emerald-800">আবদুর রাজ্জাক দাখিল মাদ্রাসা</h2>
                    <p class="text-sm">মীরেরখীল, সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম ।</p>
                    <p class="font-bold bg-emerald-800 text-white inline-block px-3 py-1 rounded mt-2">Applicant's Copy</p>
                </div>
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <p><strong>আবেদন আইডি:</strong> <span id="copy-app-id" class="text-lg font-bold"></span></p>
                        <p><strong>পদের নাম:</strong> <span id="copy-designation"></span></p>
                        <p><strong>নাম:</strong> <span id="copy-name"></span></p>
                        <p><strong>পিতা:</strong> <span id="copy-fname"></span></p>
                        <p><strong>মোবাইল:</strong> <span id="copy-mobile"></span></p>
                    </div>
                    <img id="copy-photo" src="" class="w-28 h-28 border object-cover">
                </div>
                <div class="mt-8 text-right">
                    <img id="copy-sig" src="" class="w-32 h-8 object-contain ml-auto border-b">
                    <p class="text-xs font-bold mt-1">প্রার্থীর স্বাক্ষর</p>
                </div>
            </div>
        </section>

        <!-- ৪. প্রবেশপত্র পোর্টাল (অটোমেটিক পিডিএফ) -->
        <section id="view-admit-portal" class="view hidden">
            <div class="max-w-md mx-auto bg-white p-6 rounded shadow border">
                <h2 class="text-xl font-bold text-center mb-4"><i class="fa fa-id-card text-emerald-700"></i> প্রবেশপত্র ডাউনলোড</h2>
                <input type="text" id="admit-search-id" placeholder="আবেদন আইডি দিন (যেমন: ARDM-...)" class="w-full border p-2 mb-3 rounded">
                <button onclick="searchAdmitCard()" class="w-full bg-emerald-800 text-white py-2 rounded font-bold">অনুসন্ধান করুন</button>
                
                <div id="admit-display-area" class="hidden mt-6">
                    <button onclick="downloadAsPDF('pdf-admit-area', 'Admit_Card.pdf')" class="w-full bg-red-600 text-white px-4 py-2 rounded font-bold mb-4">
                        <i class="fa fa-file-pdf"></i> Admit Card PDF ডাউনলোড করুন
                    </button>
                    <!-- PDF Admit Area -->
                    <div id="pdf-admit-area" class="border p-4 bg-white">
                        <div class="text-center border-b pb-2 mb-2">
                            <h3 class="font-bold text-lg text-emerald-800">Admit Card</h3>
                            <p class="text-xs">আবদুর রাজ্জাক দাখিল মাদ্রাসা</p>
                        </div>
                        <div class="flex justify-between">
                            <div class="text-sm">
                                <p><strong>ID:</strong> <span id="admit-id" class="font-bold"></span></p>
                                <p><strong>নাম:</strong> <span id="admit-name"></span></p>
                                <p><strong>পদ:</strong> <span id="admit-desig"></span></p>
                            </div>
                            <img id="admit-photo" class="w-20 h-20 border object-cover">
                        </div>
                        <div class="bg-gray-100 p-2 mt-3 text-sm rounded">
                            <p><strong>তারিখ:</strong> <span id="admit-date"></span></p>
                            <p><strong>সময়:</strong> <span id="admit-time"></span></p>
                            <p><strong>ভেন্যু:</strong> <span id="admit-venue"></span></p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ৫. রেজাল্ট পোর্টাল -->
        <section id="view-result-portal" class="view hidden">
            <div class="max-w-md mx-auto bg-white p-6 rounded shadow border">
                <h2 class="text-xl font-bold text-center mb-4"><i class="fa fa-poll text-emerald-700"></i> ফলাফল অনুসন্ধান</h2>
                <input type="text" id="result-search-id" placeholder="আবেদন আইডি দিন" class="w-full border p-2 mb-3 rounded">
                <button onclick="searchResult()" class="w-full bg-emerald-800 text-white py-2 rounded font-bold">রেজাল্ট দেখুন</button>
            </div>
        </section>

        <!-- ৬. অ্যাডমিন প্যানেল লগইন -->
        <section id="view-admin-login" class="view hidden">
            <div class="max-w-md mx-auto bg-white p-8 rounded shadow-2xl border-t-4 border-red-600">
                <div class="text-center mb-6">
                    <i class="fa fa-user-shield text-5xl text-red-600"></i>
                    <h2 class="text-2xl font-bold mt-2">অ্যাডমিন প্যানেল</h2>
                    <p class="text-sm text-gray-500">শুধুমাত্র মাদ্রাসা কর্তৃপক্ষের জন্য</p>
                </div>
                <form onsubmit="handleAdminLogin(event)" class="space-y-4">
                    <input type="email" id="admin-email" placeholder="Admin Email" required class="w-full border p-2 rounded font-bold">
                    <input type="password" id="admin-pass" placeholder="Password" required class="w-full border p-2 rounded font-bold">
                    <button type="submit" class="w-full bg-red-600 text-white py-3 rounded font-bold text-lg hover:bg-red-700">লগইন করুন</button>
                </form>
            </div>
        </section>

        <!-- ৭. অ্যাডমিন ড্যাশবোর্ড -->
        <section id="view-admin-dashboard" class="view hidden">
            <div class="bg-white p-6 rounded shadow border mb-6 flex justify-between items-center">
                <h2 class="text-2xl font-bold text-emerald-800"><i class="fa fa-cogs"></i> কন্ট্রোল প্যানেল</h2>
                <button onclick="document.getElementById('new-circular-form').classList.toggle('hidden')" class="bg-emerald-700 text-white px-4 py-2 rounded font-bold">নতুন সার্কুলার দিন</button>
            </div>

            <!-- নতুন সার্কুলার ফর্ম -->
            <div id="new-circular-form" class="bg-gray-50 p-6 rounded shadow border mb-6 hidden">
                <h3 class="font-bold mb-4">নতুন সার্কুলার তৈরি করুন</h3>
                <form onsubmit="createCircular(event)" class="grid grid-cols-2 gap-4">
                    <input type="text" id="circ-desig" placeholder="পদের নাম" required class="border p-2 rounded">
                    <input type="text" id="circ-edu" placeholder="শিক্ষাগত যোগ্যতা" required class="border p-2 rounded">
                    <input type="text" id="circ-vac" placeholder="শূন্য পদ (যেমন: ০২)" required class="border p-2 rounded">
                    <input type="date" id="circ-dead" required class="border p-2 rounded">
                    <button type="submit" class="col-span-2 bg-emerald-800 text-white py-2 rounded font-bold">পাবলিশ করুন</button>
                </form>
            </div>

            <!-- আবেদনকারী লিস্ট -->
            <div class="bg-white rounded shadow border overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-emerald-800 text-white">
                        <tr>
                            <th class="p-3">আইডি</th>
                            <th class="p-3">নাম ও পদ</th>
                            <th class="p-3">মোবাইল</th>
                            <th class="p-3 text-center">অ্যাকশন (প্রবেশপত্র / রেজাল্ট)</th>
                        </tr>
                    </thead>
                    <tbody id="admin-applicants-body" class="divide-y"></tbody>
                </table>
            </div>
        </section>

    </main>

    <script>
        const API_URL = '';
        let adminToken = localStorage.getItem('adminToken');
        let photoBase64 = "", sigBase64 = "";

        // নেভিগেশন
        function navigate(viewId) {
            document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
            document.getElementById('view-' + viewId).classList.remove('hidden');
            
            if(viewId === 'home') loadCirculars();
            if(viewId === 'admin-dashboard') {
                if(!adminToken) navigate('admin-login');
                else loadAdminData();
            }
        }

        // PDF ডাউনলোড ফাংশন (html2pdf.js ব্যবহার করে)
        function downloadAsPDF(elementId, filename) {
            const element = document.getElementById(elementId);
            const opt = {
                margin:       0.5,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            // এই ফাংশনটি ব্রাউজারের প্রিন্ট ডায়ালগ না এনে সরাসরি পিডিএফ ডাউনলোড করবে
            html2pdf().set(opt).from(element).save();
        }

        // ইমেজ প্রিভিউ
        function previewFile(inputId, previewId) {
            const file = document.getElementById(inputId).files[0];
            const reader = new FileReader();
            reader.onload = e => {
                document.getElementById(previewId).src = e.target.result;
                document.getElementById(previewId).classList.remove('hidden');
                if(inputId === 'photo-input') photoBase64 = e.target.result;
                else sigBase64 = e.target.result;
            };
            if(file) reader.readAsDataURL(file);
        }

        // সার্কুলার লোড
        async function loadCirculars() {
            const res = await fetch('/api/circulars');
            const data = await res.json();
            const list = document.getElementById('circulars-list');
            list.innerHTML = data.length ? '' : '<p class="text-center py-4">কোনো বিজ্ঞপ্তি নেই।</p>';
            
            data.forEach(c => {
                list.innerHTML += \`
                    <div class="border p-4 rounded flex justify-between items-center bg-gray-50">
                        <div>
                            <h3 class="font-bold text-lg text-emerald-800">\${c.designation} (পদ: \${c.vacancy})</h3>
                            <p class="text-sm">যোগ্যতা: \${c.education}</p>
                            <p class="text-xs text-red-600 font-bold mt-1">শেষ তারিখ: \${c.deadline}</p>
                        </div>
                        <button onclick="startApply('\${c.id}', '\${c.designation}')" class="bg-emerald-700 text-white px-6 py-2 rounded font-bold shadow">আবেদন করুন</button>
                    </div>
                \`;
            });
        }

        function startApply(id, desig) {
            document.getElementById('form-circular-id').value = id;
            document.getElementById('form-designation-display').innerText = desig;
            navigate('apply');
        }

        // আবেদন সাবমিট
        async function submitApplication(e) {
            e.preventDefault();
            if(!photoBase64 || !sigBase64) return alert("ছবি ও স্বাক্ষর দিন!");
            
            const data = {
                circular_id: document.getElementById('form-circular-id').value,
                designation: document.getElementById('form-designation-display').innerText,
                candidate_name: document.getElementById('c_name').value,
                father_name: document.getElementById('f_name').value,
                mother_name: document.getElementById('m_name').value,
                dob: document.getElementById('dob').value,
                mobile: document.getElementById('mobile').value,
                photo: photoBase64,
                signature: sigBase64
            };

            const res = await fetch('/api/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            
            if(result.success) {
                alert("আবেদন সফল! আপনার আইডি: " + result.applicationId);
                showApplicantCopy(result.applicationId, data);
            }
        }

        function showApplicantCopy(id, data) {
            document.getElementById('copy-app-id').innerText = id;
            document.getElementById('copy-designation').innerText = data.designation;
            document.getElementById('copy-name').innerText = data.candidate_name;
            document.getElementById('copy-fname').innerText = data.father_name;
            document.getElementById('copy-mobile').innerText = data.mobile;
            document.getElementById('copy-photo').src = data.photo;
            document.getElementById('copy-sig').src = data.signature;
            navigate('applicant-copy');
        }

        // প্রবেশপত্র সার্চ
        async function searchAdmitCard() {
            const id = document.getElementById('admit-search-id').value;
            const res = await fetch('/api/applications/' + id);
            if(res.status === 404) return alert("আবেদন আইডি পাওয়া যায়নি!");
            const data = await res.json();

            if(data.admit_status === 'Pending') return alert("প্রবেশপত্র এখনো ইস্যু করা হয়নি!");
            
            document.getElementById('admit-id').innerText = data.id;
            document.getElementById('admit-name').innerText = data.candidate_name;
            document.getElementById('admit-desig').innerText = data.designation;
            document.getElementById('admit-photo').src = data.photo;
            document.getElementById('admit-date').innerText = data.exam_date;
            document.getElementById('admit-time').innerText = data.exam_time;
            document.getElementById('admit-venue').innerText = data.exam_venue;
            
            document.getElementById('admit-display-area').classList.remove('hidden');
        }

        // রেজাল্ট সার্চ
        async function searchResult() {
            const id = document.getElementById('result-search-id').value;
            const res = await fetch('/api/applications/' + id);
            if(res.status === 404) return alert("আইডি পাওয়া যায়নি!");
            const data = await res.json();

            if(data.result_status === 'Pending') alert("ফলাফল এখনো প্রস্তুত হয়নি।");
            else if(data.result_status === 'Passed') alert("অভিনন্দন! আপনি উত্তীর্ণ। প্রাপ্ত নম্বর: " + data.result_marks);
            else alert("দুঃখিত, আপনি অনুত্তীর্ণ।");
        }

        // অ্যাডমিন লগইন
        async function handleAdminLogin(e) {
            e.preventDefault();
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: document.getElementById('admin-email').value, 
                    password: document.getElementById('admin-pass').value 
                })
            });
            const data = await res.json();
            if(data.success) {
                adminToken = data.token;
                localStorage.setItem('adminToken', adminToken);
                document.getElementById('logout-btn').classList.remove('hidden');
                document.getElementById('admin-nav-btn').classList.add('hidden');
                navigate('admin-dashboard');
            } else alert(data.message);
        }

        function logout() {
            adminToken = null;
            localStorage.removeItem('adminToken');
            window.location.reload();
        }

        // অ্যাডমিন ডাটা লোড
        async function loadAdminData() {
            const res = await fetch('/api/admin/applications', { headers: { 'Authorization': adminToken }});
            const data = await res.json();
            const tbody = document.getElementById('admin-applicants-body');
            tbody.innerHTML = '';
            
            data.forEach(a => {
                tbody.innerHTML += \`
                    <tr class="hover:bg-gray-50">
                        <td class="p-3 font-bold">\${a.id}</td>
                        <td class="p-3">\${a.candidate_name}<br><span class="text-xs text-gray-500">\${a.designation}</span></td>
                        <td class="p-3">\${a.mobile}</td>
                        <td class="p-3 text-center space-x-2">
                            <button onclick="issueAdmit('\${a.id}')" class="bg-blue-600 text-white px-2 py-1 rounded text-xs">প্রবেশপত্র দিন</button>
                            <button onclick="publishResult('\${a.id}')" class="bg-green-600 text-white px-2 py-1 rounded text-xs">রেজাল্ট দিন</button>
                        </td>
                    </tr>
                \`;
            });
        }

        async function createCircular(e) {
            e.preventDefault();
            const payload = {
                designation: document.getElementById('circ-desig').value,
                education: document.getElementById('circ-edu').value,
                vacancy: document.getElementById('circ-vac').value,
                deadline: document.getElementById('circ-dead').value
            };
            const res = await fetch('/api/circulars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
                body: JSON.stringify(payload)
            });
            if((await res.json()).success) {
                alert("সার্কুলার প্রকাশ সফল!");
                document.getElementById('new-circular-form').classList.add('hidden');
            }
        }

        async function issueAdmit(id) {
            const date = prompt("পরীক্ষার তারিখ দিন (যেমন: ২৫ ডিসেম্বর):");
            const time = prompt("সময় দিন (যেমন: সকাল ১০টা):");
            if(date && time) {
                await fetch('/api/admin/admit-card', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
                    body: JSON.stringify({ id, exam_date: date, exam_time: time, exam_venue: "মাদ্রাসা ক্যাম্পাস" })
                });
                alert("প্রবেশপত্র ইস্যু করা হয়েছে!");
            }
        }

        async function publishResult(id) {
            const status = prompt("রেজাল্ট দিন (Passed বা Failed লিখুন):");
            const marks = prompt("নম্বর দিন (যেমন: ৮০):");
            if(status) {
                await fetch('/api/admin/publish-result', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
                    body: JSON.stringify({ id, status, marks })
                });
                alert("ফলাফল আপডেট হয়েছে!");
            }
        }

        window.onload = () => {
            if(adminToken) {
                document.getElementById('logout-btn').classList.remove('hidden');
                document.getElementById('admin-nav-btn').classList.add('hidden');
            }
            navigate('home');
        };
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Professional Server running on port ${PORT}`);
});


