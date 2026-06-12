
/**
 * প্রতিষ্ঠান: আবদুর রাজ্জাক দাখিল মাদ্রাসা
 * গ্রাম: মীরেরখীল, ইউনিয়ন: সরফভাটা, উপজেলা: রাঙ্গুনিয়া, জেলা: চট্টগ্রাম
 * স্থাপিত: ২০১৮
 * লেখক: রাইসুল ইসলাম সাইদ (raisulislamsaied@gmail.com)
 * * এই ফাইলটিতে ব্যাকএন্ড API এবং রেসপন্সিভ ফ্রন্টএন্ড UI একত্রিত করে 
 * রেন্ডারে সহজে ডেপ্লয় করার উপযোগী করা হয়েছে।
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// মিডলওয়্যার
app.use(cors());
app.use(express.json({ limit: '10mb' })); // ফটো ও সিগনেচার আপলোডের জন্য সাইজ লিমিট বাড়ানো হয়েছে
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ডেটাবেজ ফাইল পাথ
const DB_FILE = path.join(__dirname, 'recruitment_db.json');

// ডেটাবেজ ইনিশিয়ালাইজেশন (অটো-হিলিং ফাইল ডাটাবেজ)
function getDB() {
    if (!fs.existsSync(DB_FILE)) {
        const defaultDB = {
            circulars: [
                {
                    id: "CIRC-101",
                    designation: "সহকারী শিক্ষক (গণিত)",
                    education: "সংশ্লিষ্ট বিষয়ে ২য় শ্রেণীর স্নাতক/সমমান ডিগ্রী অথবা মাদ্রাসা শিক্ষার ফাজিল ডিগ্রী।",
                    vacancy: "০২ জন",
                    age_limit: "১৮ থেকে ৩০ বছর",
                    salary: "১৬,০০০ - ৩৮,৬৪০/- (গ্রেড-১০)",
                    deadline: "২০২৬-০৮-১৫",
                    active: true
                },
                {
                    id: "CIRC-102",
                    designation: "অফিস সহকারী কাম কম্পিউটার অপারেটর",
                    education: "এইচএসসি/আলিম বা সমমান ডিগ্রী। কম্পিউটারে টাইপিং গতি প্রতি মিনিটে বাংলা ২০ ও ইংরেজিতে ২০ শব্দ থাকতে হবে।",
                    vacancy: "০১ জন",
                    age_limit: "১৮ থেকে ৩০ বছর",
                    salary: "৯,৩০০ - ২২,৪৯০/- (গ্রেড-১৬)",
                    deadline: "২০২৬-০৮-১৫",
                    active: true
                }
            ],
            applications: [],
            results: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 4));
        return defaultDB;
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        // ফাইল কারাপ্ট হলে রিকভার করার কোড
        return { circulars: [], applications: [], results: [] };
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4));
}

// অ্যাডমিন ক্রেডেনশিয়ালস
const ADMIN_EMAIL = "raisulislamsaied@gmail.com";
const ADMIN_PASS = "saied783";

// ১. API: অ্যাডমিন লগইন
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        // একটি সিম্পল সিকিউর টোকেন জেনারেট করা হচ্ছে
        const token = crypto.createHash('sha256').update(ADMIN_EMAIL + ADMIN_PASS + '2026').digest('hex');
        return res.json({ success: true, token, email: ADMIN_EMAIL });
    }
    return res.status(401).json({ success: false, message: "ইমেইল অথবা পাসওয়ার্ডটি সঠিক নয়!" });
});

// মিডলওয়্যার: অ্যাডমিন ভ্যালিডেশন
function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const expectedToken = crypto.createHash('sha256').update(ADMIN_EMAIL + ADMIN_PASS + '2026').digest('hex');
    if (authHeader === expectedToken) {
        next();
    } else {
        res.status(403).json({ success: false, message: "অনুমতি নেই! দয়া করে আবার লগইন করুন।" });
    }
}

// ২. API: সার্কুলার তালিকা দেখা
app.get('/api/circulars', (req, res) => {
    const db = getDB();
    res.json(db.circulars);
});

// ৩. API: সার্কুলার তৈরি করা (Admin Only)
app.post('/api/circulars', adminAuth, (req, res) => {
    const db = getDB();
    const { designation, education, vacancy, age_limit, salary, deadline } = req.body;
    
    if (!designation || !education || !vacancy || !deadline) {
        return res.status(400).json({ success: false, message: "স্টার চিহ্নিত ক্ষেত্রগুলো পূরণ করা আবশ্যক।" });
    }

    const newCircular = {
        id: "CIRC-" + (100 + db.circulars.length + 1),
        designation,
        education,
        vacancy,
        age_limit: age_limit || "১৮ থেকে ৩০ বছর",
        salary: salary || "আলোচনা সাপেক্ষে",
        deadline,
        active: true
    };

    db.circulars.unshift(newCircular); // নতুনটি প্রথমে দেখাবে
    saveDB(db);
    res.json({ success: true, message: "নতুন সার্কুলারটি সফলভাবে প্রকাশ করা হয়েছে!", data: newCircular });
});

// ৪. API: সার্কুলার বন্ধ/ডিলিট করা (Admin Only)
app.delete('/api/circulars/:id', adminAuth, (req, res) => {
    const db = getDB();
    const { id } = req.params;
    db.circulars = db.circulars.filter(c => c.id !== id);
    saveDB(db);
    res.json({ success: true, message: "সার্কুলারটি সফলভাবে মুছে ফেলা হয়েছে।" });
});

// ৫. API: আবেদন সাবমিট করা (User)
app.post('/api/applications', (req, res) => {
    const db = getDB();
    const appData = req.body;

    if (!appData.circular_id || !appData.candidate_name || !appData.father_name || !appData.mother_name || !appData.mobile) {
        return res.status(400).json({ success: false, message: "আবশ্যক তথ্যসমূহ প্রদান করা হয়নি।" });
    }

    // ইউনিক রোল/আবেদন আইডি জেনারেট করা
    const serial = 1000 + db.applications.length + 1;
    const applicationId = `ARDM-2026-${serial}`;

    const newApplication = {
        id: applicationId,
        apply_date: new Date().toISOString().split('T')[0],
        circular_id: appData.circular_id,
        designation: appData.designation,
        candidate_name: appData.candidate_name,
        father_name: appData.father_name,
        mother_name: appData.mother_name,
        dob: appData.dob,
        gender: appData.gender,
        religion: appData.religion,
        mobile: appData.mobile,
        email: appData.email || 'N/A',
        present_address: appData.present_address,
        permanent_address: appData.permanent_address,
        ssc_exam: appData.ssc_exam,
        ssc_board: appData.ssc_board,
        ssc_roll: appData.ssc_roll,
        ssc_result: appData.ssc_result,
        hsc_exam: appData.hsc_exam,
        hsc_board: appData.hsc_board,
        hsc_roll: appData.hsc_roll,
        hsc_result: appData.hsc_result,
        photo: appData.photo, // Base64 Image
        signature: appData.signature, // Base64 Image
        payment_status: "Paid", // অটো পেইড স্ট্যাটাস রাখা হয়েছে ব্যবহারের সুবিধার্থে
        admit_card_status: "Pending", // Pending, Generated
        exam_date: "",
        exam_time: "",
        exam_venue: "আবদুর রাজ্জাক দাখিল মাদ্রাসা মাঠ/শ্রেণীকক্ষ",
        result_status: "Pending", // Pending, Passed, Failed
        result_marks: ""
    };

    db.applications.push(newApplication);
    saveDB(db);
    res.json({ success: true, message: "আপনার আবেদনটি সফলভাবে গৃহীত হয়েছে!", applicationId });
});

// ৬. API: আবেদন আইডি দিয়ে সিঙ্গেল আবেদন খোঁজা (আবেদনপত্র এবং প্রবেশপত্র ডাউনলোডের জন্য)
app.get('/api/applications/:id', (req, res) => {
    const db = getDB();
    const app = db.applications.find(a => a.id === req.params.id);
    if (!app) {
        return res.status(404).json({ success: false, message: "এই আবেদন আইডি দিয়ে কোনো রেকর্ড খুঁজে পাওয়া যায়নি!" });
    }
    res.json(app);
});

// ৭. API: সকল আবেদনকারীর তালিকা দেখা (Admin Only)
app.get('/api/admin/applications', adminAuth, (req, res) => {
    const db = getDB();
    res.json(db.applications);
});

// ৮. API: প্রবেশপত্র ইস্যু করা/আপডেট করা (Admin Only)
app.post('/api/admin/admit-card', adminAuth, (req, res) => {
    const db = getDB();
    const { id, exam_date, exam_time, exam_venue } = req.body;

    const application = db.applications.find(a => a.id === id);
    if (!application) {
        return res.status(404).json({ success: false, message: "আবেদনকারী পাওয়া যায়নি।" });
    }

    application.admit_card_status = "Generated";
    application.exam_date = exam_date;
    application.exam_time = exam_time;
    application.exam_venue = exam_venue || "আবদুর রাজ্জাক দাখিল মাদ্রাসা";

    saveDB(db);
    res.json({ success: true, message: "প্রবেশপত্র সফলভাবে ইস্যু করা হয়েছে!" });
});

// ৯. API: ফলাফল ঘোষণা ও আপলোড করা (Admin Only)
app.post('/api/admin/publish-result', adminAuth, (req, res) => {
    const db = getDB();
    const { id, status, marks } = req.body; // status: 'Passed' or 'Failed'

    const application = db.applications.find(a => a.id === id);
    if (!application) {
        return res.status(404).json({ success: false, message: "আবেদনকারী পাওয়া যায়নি।" });
    }

    application.result_status = status;
    application.result_marks = marks;

    // রেজাল্টস অ্যারেতে রেকর্ড রাখা
    const resultIndex = db.results.findIndex(r => r.id === id);
    if (resultIndex > -1) {
        db.results[resultIndex] = { id, designation: application.designation, candidate_name: application.candidate_name, status, marks };
    } else {
        db.results.push({ id, designation: application.designation, candidate_name: application.candidate_name, status, marks });
    }

    saveDB(db);
    res.json({ success: true, message: "ফলাফল সফলভাবে আপডেট করা হয়েছে!" });
});

// ১০. API: ফলাফল খোঁজা (User/Public)
app.get('/api/results/:id', (req, res) => {
    const db = getDB();
    const result = db.applications.find(a => a.id === req.params.id);
    if (!result) {
        return res.status(404).json({ success: false, message: "প্রদত্ত আবেদন আইডি সম্বলিত কোনো ফলাফল পাওয়া যায়নি।" });
    }
    res.json({
        id: result.id,
        candidate_name: result.candidate_name,
        designation: result.designation,
        status: result.result_status,
        marks: result.result_marks
    });
});


// ফ্রন্টএন্ড UI পরিবেশন (সিঙ্গেল পেজ অ্যাপ্লিকেশন)
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
    <!-- FontAwesome for Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap');
        body {
            font-family: 'Hind Siliguri', sans-serif;
            background-color: #f3f4f6;
        }
        @media print {
            .no-print {
                display: none !important;
            }
            .print-area {
                width: 100% !important;
                border: none !important;
                padding: 0 !important;
                box-shadow: none !important;
            }
        }
    </style>
</head>
<body class="min-h-screen flex flex-col">

    <!-- Header Section -->
    <header class="bg-emerald-800 text-white shadow-md no-print">
        <div class="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
            <div class="flex items-center space-x-4 mb-4 md:mb-0">
                <!-- Madrasah Logo (SVG) -->
                <div class="bg-white p-2 rounded-full shadow-lg">
                    <svg class="w-12 h-12 text-emerald-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                </div>
                <div>
                    <h1 class="text-2xl md:text-3xl font-bold">আবদুর রাজ্জাক দাখিল মাদ্রাসা</h1>
                    <p class="text-xs md:text-sm text-emerald-200">মীরেরখীল, সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম । স্থাপিত: ২০১৮</p>
                </div>
            </div>
            <nav class="flex flex-wrap gap-2 justify-center">
                <button onclick="navigate('home')" class="px-4 py-2 hover:bg-emerald-700 rounded transition duration-200 text-sm font-semibold"><i class="fa fa-home"></i> হোম</button>
                <button onclick="navigate('admit-portal')" class="px-4 py-2 hover:bg-emerald-700 rounded transition duration-200 text-sm font-semibold"><i class="fa fa-id-card"></i> প্রবেশপত্র</button>
                <button onclick="navigate('result-portal')" class="px-4 py-2 hover:bg-emerald-700 rounded transition duration-200 text-sm font-semibold"><i class="fa fa-poll"></i> ফলাফল</button>
                <button id="admin-nav-btn" onclick="navigate('admin-panel')" class="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 rounded transition duration-200 text-sm font-semibold"><i class="fa fa-lock"></i> অ্যাডমিন প্যানেল</button>
                <button id="logout-btn" onclick="logout()" class="hidden px-4 py-2 bg-red-700 hover:bg-red-600 rounded transition duration-200 text-sm font-semibold"><i class="fa fa-sign-out-alt"></i> লগআউট</button>
            </nav>
        </div>
    </header>

    <!-- Main Container -->
    <main class="flex-grow container mx-auto px-4 py-8">
        
        <!-- alert message banner -->
        <div id="alert-box" class="hidden mb-6 p-4 rounded-lg shadow-md flex justify-between items-center transition-all duration-300">
            <span id="alert-message" class="font-semibold text-sm"></span>
            <button onclick="hideAlert()" class="text-lg font-bold">&times;</button>
        </div>

        <!-- 1. HOME VIEW (Active Circulars) -->
        <section id="view-home" class="view">
            <div class="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <div class="bg-emerald-700 text-white px-6 py-4 flex justify-between items-center">
                    <h2 class="text-xl font-bold"><i class="fa fa-file-invoice"></i> চলমান নিয়োগ বিজ্ঞপ্তি সমূহ</h2>
                    <span class="bg-emerald-900 text-xs px-3 py-1 rounded-full animate-pulse">অনলাইন আবেদন চলমান</span>
                </div>
                <div class="p-6">
                    <div id="circulars-list" class="space-y-6">
                        <!-- Loaded Dynamically -->
                        <div class="text-center py-12">
                            <i class="fa fa-spinner fa-spin text-4xl text-emerald-800"></i>
                            <p class="mt-2 text-gray-600">বিজ্ঞপ্তি লোড হচ্ছে...</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 2. APPLICATION FORM VIEW -->
        <section id="view-apply" class="view hidden">
            <div class="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
                <div class="bg-emerald-700 text-white px-6 py-4">
                    <h2 class="text-xl font-bold"><i class="fa fa-edit"></i> সরকারি নিয়োগ আবেদন ফরম (টেলিটক স্টাইল)</h2>
                    <p class="text-xs text-emerald-200 mt-1">দয়া করে সার্টিফিকেটের সাথে মিল রেখে সমস্ত তথ্য বাংলায় পূরণ করুন।</p>
                </div>
                <form id="recruitment-form" onsubmit="submitApplication(event)" class="p-6 space-y-6">
                    <input type="hidden" id="form-circular-id">
                    
                    <!-- পদের তথ্য -->
                    <div class="bg-emerald-50 p-4 rounded border border-emerald-200">
                        <label class="block text-sm font-bold text-emerald-900">আবেদনকৃত পদ:</label>
                        <input type="text" id="form-designation" readonly class="mt-1 block w-full bg-emerald-100 border border-emerald-300 rounded p-2 text-emerald-950 font-bold focus:outline-none">
                    </div>

                    <!-- ব্যক্তিগত তথ্য -->
                    <div>
                        <h3 class="text-lg font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4"><i class="fa fa-user"></i> ব্যক্তিগত তথ্যাবলী (Personal Information)</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700">আবেদনকারীর নাম (বাংলায়) <span class="text-red-500">*</span></label>
                                <input type="text" id="cand_name" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700">পিতার নাম (বাংলায়) <span class="text-red-500">*</span></label>
                                <input type="text" id="father_name" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700">মাতার নাম (বাংলায়) <span class="text-red-500">*</span></label>
                                <input type="text" id="mother_name" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700">জন্ম তারিখ <span class="text-red-500">*</span></label>
                                <input type="date" id="dob" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700">লিঙ্গ <span class="text-red-500">*</span></label>
                                <select id="gender" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <option value="পুরুষ">পুরুষ</option>
                                    <option value="মহিলা">মহিলা</option>
                                    <option value="অন্যান্য">অন্যান্য</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700">ধর্ম <span class="text-red-500">*</span></label>
                                <select id="religion" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <option value="ইসলাম">ইসলাম</option>
                                    <option value="হিন্দু">হিন্দু</option>
                                    <option value="বৌদ্ধ">বৌদ্ধ</option>
                                    <option value="খ্রিষ্টান">খ্রিষ্টান</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700">মোবাইল নাম্বার <span class="text-red-500">*</span></label>
                                <input type="tel" id="mobile" required placeholder="017XXXXXXXX" class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700">ইমেইল এড্রেস</label>
                                <input type="email" id="email" placeholder="example@gmail.com" class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                            </div>
                        </div>
                    </div>

                    <!-- ঠিকানা -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-md font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-3"><i class="fa fa-map-marker-alt"></i> বর্তমান ঠিকানা</h3>
                            <textarea id="present_address" required rows="3" placeholder="গ্রাম, ডাকঘর, উপজেলা, জেলা" class="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"></textarea>
                        </div>
                        <div>
                            <h3 class="text-md font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-3"><i class="fa fa-map-marked-alt"></i> স্থায়ী ঠিকানা</h3>
                            <textarea id="permanent_address" required rows="3" placeholder="গ্রাম, ডাকঘর, উপজেলা, জেলা" class="block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"></textarea>
                        </div>
                    </div>

                    <!-- শিক্ষাগত যোগ্যতা -->
                    <div>
                        <h3 class="text-lg font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4"><i class="fa fa-graduation-cap"></i> শিক্ষাগত যোগ্যতা (Academic Qualifications)</h3>
                        <div class="space-y-4">
                            <!-- SSC/Equivalent -->
                            <div class="bg-gray-50 p-4 rounded border border-gray-200">
                                <h4 class="font-bold text-sm text-gray-700 mb-2">এস.এস.সি / দাখিল / সমমান</h4>
                                <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <input type="text" id="ssc_exam" placeholder="পরীক্ষার নাম (উদা: দাখিল)" required class="border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <input type="text" id="ssc_board" placeholder="বোর্ড (উদা: মাদ্রাসা)" required class="border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <input type="text" id="ssc_roll" placeholder="রোল নং" required class="border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <input type="text" id="ssc_result" placeholder="জিপিএ (যেমন: ৫.০০)" required class="border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                </div>
                            </div>
                            <!-- HSC/Equivalent -->
                            <div class="bg-gray-50 p-4 rounded border border-gray-200">
                                <h4 class="font-bold text-sm text-gray-700 mb-2">এইচ.এস.সি / আলিম / সমমান</h4>
                                <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <input type="text" id="hsc_exam" placeholder="পরীক্ষার নাম (উদা: আলিম)" class="border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <input type="text" id="hsc_board" placeholder="বোর্ড" class="border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <input type="text" id="hsc_roll" placeholder="রোল নং" class="border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <input type="text" id="hsc_result" placeholder="জিপিএ" class="border border-gray-300 rounded p-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ছবি ও সিগনেচার আপলোড -->
                    <div>
                        <h3 class="text-lg font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4"><i class="fa fa-camera"></i> ছবি এবং স্বাক্ষর সংযুক্তি (Photo & Signature)</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="border border-dashed border-gray-300 p-4 rounded text-center">
                                <label class="block text-sm font-bold text-gray-700 mb-2">আবেদনকারীর রঙিন ছবি (অনূর্ধ্ব ১০০kb)</label>
                                <input type="file" id="photo-input" accept="image/*" required onchange="previewFile('photo-input', 'photo-preview')" class="mx-auto block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100">
                                <img id="photo-preview" src="https://placehold.co/300x300/e2e8f0/cccccc?text=Photo+300x300" class="mt-3 mx-auto w-32 h-32 object-cover border border-gray-300">
                            </div>
                            <div class="border border-dashed border-gray-300 p-4 rounded text-center">
                                <label class="block text-sm font-bold text-gray-700 mb-2">আবেদনকারীর স্বাক্ষর (অনূর্ধ্ব ৬০kb)</label>
                                <input type="file" id="sig-input" accept="image/*" required onchange="previewFile('sig-input', 'sig-preview')" class="mx-auto block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100">
                                <img id="sig-preview" src="https://placehold.co/300x80/e2e8f0/cccccc?text=Signature+300x80" class="mt-3 mx-auto w-48 h-12 object-contain border border-gray-300">
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-2">
                        <button type="button" onclick="navigate('home')" class="bg-gray-500 text-white px-6 py-2.5 rounded font-semibold hover:bg-gray-600 transition">বাতিল</button>
                        <button type="submit" class="bg-emerald-700 text-white px-8 py-2.5 rounded font-semibold hover:bg-emerald-800 transition shadow-md"><i class="fa fa-check-circle"></i> আবেদন জমা দিন</button>
                    </div>
                </form>
            </div>
        </section>

        <!-- 3. APPLICANT'S COPY VIEW (Download after submission) -->
        <section id="view-applicant-copy" class="view hidden">
            <div class="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-2xl border border-gray-300 print-area">
                <div class="text-center border-b-2 border-emerald-800 pb-4 mb-6">
                    <h2 class="text-2xl font-bold text-emerald-800">আবদুর রাজ্জাক দাখিল মাদ্রাসা</h2>
                    <p class="text-sm text-gray-600 font-semibold">মীরেরখীল, সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম ।</p>
                    <p class="text-lg font-bold bg-emerald-800 text-white inline-block px-4 py-1 rounded mt-2">আবেদনকারীর কপি (Applicant's Copy)</p>
                </div>

                <div class="flex justify-between items-start mb-6">
                    <div class="space-y-1 text-sm">
                        <p><strong>আবেদন আইডি (Application ID):</strong> <span id="copy-app-id" class="text-lg font-bold text-emerald-700"></span></p>
                        <p><strong>পদের নাম:</strong> <span id="copy-designation" class="font-bold"></span></p>
                        <p><strong>আবেদনের তারিখ:</strong> <span id="copy-date"></span></p>
                        <p><strong>পেমেন্ট স্ট্যাটাস:</strong> <span class="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">PAID</span></p>
                    </div>
                    <img id="copy-photo" src="" class="w-32 h-32 border border-gray-300 object-cover shadow">
                </div>

                <!-- Personal Info Table -->
                <table class="w-full text-left border-collapse border border-gray-300 text-sm mb-6">
                    <thead>
                        <tr class="bg-emerald-50">
                            <th colspan="2" class="border border-gray-300 px-4 py-2 text-emerald-900 font-bold">ব্যক্তিগত তথ্যাবলী</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="border border-gray-300 px-4 py-2 font-semibold bg-gray-50 w-1/3">আবেদনকারীর নাম</td>
                            <td id="copy-cand-name" class="border border-gray-300 px-4 py-2"></td>
                        </tr>
                        <tr>
                            <td class="border border-gray-300 px-4 py-2 font-semibold bg-gray-50">পিতার নাম</td>
                            <td id="copy-father-name" class="border border-gray-300 px-4 py-2"></td>
                        </tr>
                        <tr>
                            <td class="border border-gray-300 px-4 py-2 font-semibold bg-gray-50">মাতার নাম</td>
                            <td id="copy-mother-name" class="border border-gray-300 px-4 py-2"></td>
                        </tr>
                        <tr>
                            <td class="border border-gray-300 px-4 py-2 font-semibold bg-gray-50">জন্ম তারিখ</td>
                            <td id="copy-dob" class="border border-gray-300 px-4 py-2"></td>
                        </tr>
                        <tr>
                            <td class="border border-gray-300 px-4 py-2 font-semibold bg-gray-50">মোবাইল নাম্বার</td>
                            <td id="copy-mobile" class="border border-gray-300 px-4 py-2 font-semibold text-emerald-800"></td>
                        </tr>
                        <tr>
                            <td class="border border-gray-300 px-4 py-2 font-semibold bg-gray-50">বর্তমান ঠিকানা</td>
                            <td id="copy-present-addr" class="border border-gray-300 px-4 py-2"></td>
                        </tr>
                    </tbody>
                </table>

                <!-- Signatures -->
                <div class="mt-12 flex justify-between items-end">
                    <div class="text-center">
                        <img id="copy-signature" src="" class="w-40 h-10 object-contain mx-auto mb-1">
                        <div class="border-t border-gray-400 pt-1 text-xs">আবেদনকারীর স্বাক্ষর</div>
                    </div>
                    <div class="text-center">
                        <div class="h-10"></div>
                        <div class="border-t border-gray-400 pt-1 text-xs font-bold">সুপারভাইজার / প্রধান সিগনেচার</div>
                    </div>
                </div>

                <!-- Print Action Button -->
                <div class="mt-8 text-center no-print">
                    <button onclick="window.print()" class="bg-emerald-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition mr-2"><i class="fa fa-print"></i> ডাউনলোড ও প্রিন্ট করুন</button>
                    <button onclick="navigate('home')" class="bg-gray-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500 transition">হোমে ফিরে যান</button>
                </div>
            </div>
        </section>

        <!-- 4. ADMIT CARD PORTAL -->
        <section id="view-admit-portal" class="view hidden">
            <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-xl border border-gray-200">
                <div class="text-center mb-6">
                    <i class="fa fa-id-card text-5xl text-emerald-800"></i>
                    <h2 class="text-2xl font-bold text-gray-800 mt-2">প্রবেশপত্র ডাউনলোড পোর্টাল</h2>
                    <p class="text-sm text-gray-500">আপনার আবেদন আইডি দিয়ে প্রবেশপত্র সংগ্রহ করুন।</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700">আবেদন আইডি (Application ID)</label>
                        <input type="text" id="admit-search-id" placeholder="যেমন: ARDM-2026-1001" class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <button onclick="searchAdmitCard()" class="w-full bg-emerald-800 text-white py-2.5 rounded font-bold hover:bg-emerald-700 transition shadow"><i class="fa fa-search"></i> অনুসন্ধান করুন</button>
                </div>

                <!-- Admit Card Display Area (Initially Hidden) -->
                <div id="admit-display-area" class="hidden mt-8 border-t pt-6">
                    <!-- Dynamic Admit Card -->
                </div>
            </div>
        </section>

        <!-- 5. RESULT PORTAL -->
        <section id="view-result-portal" class="view hidden">
            <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow-xl border border-gray-200">
                <div class="text-center mb-6">
                    <i class="fa fa-poll text-5xl text-emerald-800"></i>
                    <h2 class="text-2xl font-bold text-gray-800 mt-2">নিয়োগ পরীক্ষার ফলাফল</h2>
                    <p class="text-sm text-gray-500">ফলাফল জানতে রোল নম্বর বা আবেদন আইডি প্রদান করুন।</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700">আবেদন আইডি (Application ID)</label>
                        <input type="text" id="result-search-id" placeholder="যেমন: ARDM-2026-1001" class="mt-1 block w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <button onclick="searchResult()" class="w-full bg-emerald-800 text-white py-2.5 rounded font-bold hover:bg-emerald-700 transition shadow"><i class="fa fa-search"></i> রেজাল্ট দেখুন</button>
                </div>

                <!-- Result Result Display -->
                <div id="result-display-area" class="hidden mt-6 p-4 rounded-lg border text-center">
                    <!-- Dynamic Content -->
                </div>
            </div>
        </section>

        <!-- 6. ADMIN LOGIN MODAL / VIEW -->
        <section id="view-admin-login" class="view hidden">
            <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-xl border border-gray-200">
                <div class="text-center mb-6">
                    <i class="fa fa-lock text-5xl text-emerald-800"></i>
                    <h2 class="text-2xl font-bold mt-2">অ্যাডমিন প্রবেশদ্বার</h2>
                    <p class="text-sm text-gray-500">মাদ্রাসার নিয়োগ বোর্ড এডমিন প্যানেলে লগইন করুন</p>
                </div>
                <form onsubmit="handleAdminLogin(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700">অ্যাডমিন ইমেইল</label>
                        <input type="email" id="admin-email" required class="mt-1 block w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700">পাসওয়ার্ড</label>
                        <input type="password" id="admin-pass" required class="mt-1 block w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <button type="submit" class="w-full bg-emerald-800 text-white py-2.5 rounded font-bold hover:bg-emerald-700 transition shadow-md">লগইন করুন</button>
                </form>
            </div>
        </section>

        <!-- 7. ADMIN DASHBOARD (Authenticated) -->
        <section id="view-admin-dashboard" class="view hidden">
            <div class="space-y-8">
                <!-- Admin Header -->
                <div class="bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col md:flex-row justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">স্বাগতম, অ্যাডমিন প্যানেল</h2>
                        <p class="text-sm text-emerald-700">আবদুর রাজ্জাক দাখিল মাদ্রাসা নিয়োগ ও পরীক্ষা নিয়ন্ত্রণ বোর্ড।</p>
                    </div>
                    <div class="mt-4 md:mt-0 flex gap-2">
                        <button onclick="toggleAdminSection('circular-creator')" class="px-4 py-2 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800 transition"><i class="fa fa-plus"></i> নতুন সার্কুলার তৈরি</button>
                        <button onclick="toggleAdminSection('applicants-list')" class="px-4 py-2 bg-blue-700 text-white rounded font-bold hover:bg-blue-800 transition"><i class="fa fa-users"></i> আবেদনকারী তালিকা</button>
                    </div>
                </div>

                <!-- Admin Action 1: Create Circular -->
                <div id="admin-circular-creator" class="bg-white p-6 rounded-lg shadow border border-gray-200 hidden">
                    <h3 class="text-xl font-bold text-emerald-800 mb-4 border-b pb-2"><i class="fa fa-plus-circle"></i> নতুন নিয়োগ বিজ্ঞপ্তি বা সার্কুলার তৈরি করুন</h3>
                    <form onsubmit="createCircular(event)" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700">পদের নাম (Designation) <span class="text-red-500">*</span></label>
                            <input type="text" id="circ-designation" placeholder="যেমন: সহকারী শিক্ষক (বাংলা)" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700">শিক্ষাগত যোগ্যতা ও অভিজ্ঞতা <span class="text-red-500">*</span></label>
                            <input type="text" id="circ-education" placeholder="যেমন: স্নাতক/ফাজিল ডিগ্রী..." required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700">শূন্য পদের সংখ্যা <span class="text-red-500">*</span></label>
                            <input type="text" id="circ-vacancy" placeholder="যেমন: ০২ জন" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700">বয়স সীমা</label>
                            <input type="text" id="circ-age" placeholder="যেমন: ১৮ থেকে ৩০ বছর" class="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700">বেতন স্কেল / গ্রেড</label>
                            <input type="text" id="circ-salary" placeholder="যেমন: ১৬,০০০-৩৮,৬৪০/- (১০ম গ্রেড)" class="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700">আবেদনের শেষ তারিখ <span class="text-red-500">*</span></label>
                            <input type="date" id="circ-deadline" required class="mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        </div>
                        <div class="md:col-span-2 flex justify-end">
                            <button type="submit" class="bg-emerald-800 text-white px-6 py-2 rounded font-bold hover:bg-emerald-700 transition">প্রকাশ করুন</button>
                        </div>
                    </form>
                </div>

                <!-- Admin Action 2: Applicants and Operations List -->
                <div id="admin-applicants-list" class="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div class="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 class="text-xl font-bold text-gray-800"><i class="fa fa-users"></i> জমাকৃত আবেদনকারীর তালিকা ও পরীক্ষা নিয়ন্ত্রণ</h3>
                        <span class="text-xs bg-gray-100 px-3 py-1.5 rounded text-gray-600 font-semibold" id="total-applicants-badge">মোট আবেদন: ০ জন</span>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse border border-gray-200 text-sm">
                            <thead>
                                <tr class="bg-gray-100 text-gray-700 font-bold">
                                    <th class="border border-gray-200 px-3 py-2">রোল/আবেদন আইডি</th>
                                    <th class="border border-gray-200 px-3 py-2">নাম ও পদের নাম</th>
                                    <th class="border border-gray-200 px-3 py-2">মোবাইল নম্বর</th>
                                    <th class="border border-gray-200 px-3 py-2 text-center">প্রবেশপত্র স্ট্যাটাস</th>
                                    <th class="border border-gray-200 px-3 py-2 text-center">ফলাফল স্ট্যাটাস</th>
                                    <th class="border border-gray-200 px-3 py-2 text-center">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody id="admin-applicants-table-body" class="divide-y divide-gray-100">
                                <!-- Loaded Dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Admin Action Modal (Issue Admit/Result popup in dashboard) -->
                <div id="admin-action-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 relative">
                        <button onclick="closeAdminModal()" class="absolute top-3 right-3 text-2xl font-bold text-gray-500 hover:text-gray-700">&times;</button>
                        
                        <!-- Dynamically filled with javascript -->
                        <div id="modal-content-area"></div>
                    </div>
                </div>

            </div>
        </section>

    </main>

    <!-- Footer Section -->
    <footer class="bg-emerald-950 text-white py-6 mt-12 no-print border-t-4 border-amber-500">
        <div class="container mx-auto px-4 text-center text-sm">
            <p class="font-semibold">&copy; ২০২৬ আবদুর রাজ্জাক দাখিল মাদ্রাসা। সর্বস্বত্ব সংরক্ষিত।</p>
            <p class="text-emerald-300 text-xs mt-1">মীরেরখীল, সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম ।</p>
            <p class="text-[10px] text-emerald-500 mt-2">কারিগরি সহযোগিতায়: মাদ্রাসার অভ্যন্তরীণ পরীক্ষা ও নিয়োগ সেল</p>
        </div>
    </footer>

    <!-- JS Implementation -->
    <script>
        // ভিউ ম্যানেজমেন্ট
        const views = ['home', 'apply', 'applicant-copy', 'admit-portal', 'result-portal', 'admin-login', 'admin-dashboard'];
        let currentAdminToken = localStorage.getItem('adminToken') || null;

        function navigate(viewName) {
            views.forEach(v => {
                const element = document.getElementById('view-' + v);
                if (element) {
                    if (v === viewName) {
                        element.classList.remove('hidden');
                    } else {
                        element.classList.add('hidden');
                    }
                }
            });

            // ভিউ ভিত্তিক ডাটা রিফ্রেশ
            if (viewName === 'home') {
                loadCirculars();
            } else if (viewName === 'admin-dashboard') {
                if (!currentAdminToken) {
                    navigate('admin-login');
                } else {
                    loadAdminDashboard();
                }
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // অ্যালার্ট নোটিফিকেশন সিস্টেম
        function showAlert(message, type = 'success') {
            const alertBox = document.getElementById('alert-box');
            const alertMsg = document.getElementById('alert-message');
            alertMsg.innerText = message;
            
            alertBox.className = "mb-6 p-4 rounded-lg shadow-md flex justify-between items-center transition-all duration-300 ";
            if (type === 'success') {
                alertBox.classList.add('bg-emerald-100', 'text-emerald-800', 'border', 'border-emerald-200');
            } else {
                alertBox.classList.add('bg-red-100', 'text-red-800', 'border', 'border-red-200');
            }
            alertBox.classList.remove('hidden');
            setTimeout(() => {
                hideAlert();
            }, 6000);
        }

        function hideAlert() {
            document.getElementById('alert-box').classList.add('hidden');
        }

        // ছবি এবং সিগনেচার ফাইল প্রিভিউ
        let applicantPhotoBase64 = "";
        let applicantSigBase64 = "";

        function previewFile(inputId, previewId) {
            const preview = document.getElementById(previewId);
            const file = document.getElementById(inputId).files[0];
            const reader = new FileReader();

            reader.addEventListener("load", function () {
                preview.src = reader.result;
                if (inputId === 'photo-input') {
                    applicantPhotoBase64 = reader.result;
                } else if (inputId === 'sig-input') {
                    applicantSigBase64 = reader.result;
                }
            }, false);

            if (file) {
                reader.readAsDataURL(file);
            }
        }

        // ১. সার্কুলার রেন্ডারিং (হোম পেজ)
        async function loadCirculars() {
            const listContainer = document.getElementById('circulars-list');
            try {
                const response = await fetch('/api/circulars');
                const circulars = await response.json();
                
                if (circulars.length === 0) {
                    listContainer.innerHTML = '<div class="text-center py-12 text-gray-500 font-bold">বর্তমানে কোনো নিয়োগ বিজ্ঞপ্তি চলমান নেই।</div>';
                    return;
                }

                listContainer.innerHTML = '';
                circulars.forEach(c => {
                    listContainer.innerHTML += \`
                        <div class="border border-gray-200 rounded-lg p-6 bg-gray-50 hover:border-emerald-400 hover:shadow-md transition duration-200">
                            <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
                                <div>
                                    <span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">নিয়োগ কোড: \${c.id}</span>
                                    <h3 class="text-xl font-bold text-gray-800 mt-2">\${c.designation}</h3>
                                    <p class="text-sm text-gray-600 mt-1"><strong>শূন্য পদ:</strong> \${c.vacancy} | <strong>বয়স সীমা:</strong> \${c.age_limit}</p>
                                    <p class="text-sm text-gray-600 mt-1"><strong>বেতন স্কেল:</strong> \${c.salary}</p>
                                    <div class="mt-3 p-3 bg-white rounded border border-gray-100">
                                        <p class="text-xs text-gray-700"><strong>যোগ্যতা ও অভিজ্ঞতা:</strong> \${c.education}</p>
                                    </div>
                                </div>
                                <div class="mt-4 md:mt-0 flex flex-col items-end w-full md:w-auto">
                                    <span class="text-xs text-red-600 font-semibold mb-2"><i class="fa fa-calendar-alt"></i> আবেদনের শেষ তারিখ: \${c.deadline}</span>
                                    <button onclick="initiateApply('\${c.id}', '\${c.designation}')" class="w-full md:w-auto bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2 rounded font-bold shadow transition"><i class="fa fa-paper-plane"></i> আবেদন করুন</button>
                                </div>
                            </div>
                        </div>
                    \`;
                });
            } catch (error) {
                listContainer.innerHTML = '<div class="text-center py-12 text-red-500 font-bold">সার্কুলার লোড করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।</div>';
            }
        }

        // ২. আবেদন প্রক্রিয়া শুরু করা
        function initiateApply(circularId, designation) {
            document.getElementById('form-circular-id').value = circularId;
            document.getElementById('form-designation').value = designation;
            
            // পূর্বের ফর্ম ক্লিয়ার
            document.getElementById('recruitment-form').reset();
            document.getElementById('photo-preview').src = "https://placehold.co/300x300/e2e8f0/cccccc?text=Photo+300x300";
            document.getElementById('sig-preview').src = "https://placehold.co/300x80/e2e8f0/cccccc?text=Signature+300x80";
            applicantPhotoBase64 = "";
            applicantSigBase64 = "";

            navigate('apply');
        }

        // ৩. আবেদন জমা দেওয়া (User Submit)
        async function submitApplication(e) {
            e.preventDefault();
            
            if (!applicantPhotoBase64 || !applicantSigBase64) {
                showAlert("অনুগ্রহ করে আবেদনকারীর ছবি ও স্বাক্ষর আপলোড করুন!", "danger");
                return;
            }

            const appData = {
                circular_id: document.getElementById('form-circular-id').value,
                designation: document.getElementById('form-designation').value,
                candidate_name: document.getElementById('cand_name').value,
                father_name: document.getElementById('father_name').value,
                mother_name: document.getElementById('mother_name').value,
                dob: document.getElementById('dob').value,
                gender: document.getElementById('gender').value,
                religion: document.getElementById('religion').value,
                mobile: document.getElementById('mobile').value,
                email: document.getElementById('email').value,
                present_address: document.getElementById('present_address').value,
                permanent_address: document.getElementById('permanent_address').value,
                ssc_exam: document.getElementById('ssc_exam').value,
                ssc_board: document.getElementById('ssc_board').value,
                ssc_roll: document.getElementById('ssc_roll').value,
                ssc_result: document.getElementById('ssc_result').value,
                hsc_exam: document.getElementById('hsc_exam').value,
                hsc_board: document.getElementById('hsc_board').value,
                hsc_roll: document.getElementById('hsc_roll').value,
                hsc_result: document.getElementById('hsc_result').value,
                photo: applicantPhotoBase64,
                signature: applicantSigBase64
            };

            try {
                const response = await fetch('/api/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appData)
                });
                const result = await response.json();
                
                if (result.success) {
                    showAlert("আপনার আবেদনপত্রটি সফলভাবে দাখিল হয়েছে! আবেদন আইডি: " + result.applicationId, "success");
                    loadApplicantCopy(result.applicationId);
                } else {
                    showAlert(result.message, "danger");
                }
            } catch (error) {
                showAlert("সার্ভার ত্রুটি! আবেদন সম্পন্ন করা সম্ভব হয়নি।", "danger");
            }
        }

        // ৪. সফল সাবমিট শেষে আবেদন কপির প্রিভিউ লোড করা
        async function loadApplicantCopy(appId) {
            try {
                const response = await fetch('/api/applications/' + appId);
                const app = await response.json();

                if (app) {
                    document.getElementById('copy-app-id').innerText = app.id;
                    document.getElementById('copy-designation').innerText = app.designation;
                    document.getElementById('copy-date').innerText = app.apply_date;
                    document.getElementById('copy-cand-name').innerText = app.candidate_name;
                    document.getElementById('copy-father-name').innerText = app.father_name;
                    document.getElementById('copy-mother-name').innerText = app.mother_name;
                    document.getElementById('copy-dob').innerText = app.dob;
                    document.getElementById('copy-mobile').innerText = app.mobile;
                    document.getElementById('copy-present-addr').innerText = app.present_address;
                    
                    document.getElementById('copy-photo').src = app.photo;
                    document.getElementById('copy-signature').src = app.signature;

                    navigate('applicant-copy');
                }
            } catch (e) {
                showAlert("আবেদন কপির প্রিভিউ তৈরিতে সমস্যা হয়েছে। তবে আবেদনটি জমা হয়েছে!", "danger");
            }
        }

        // ৫. প্রবেশপত্র সার্চ করুন
        async function searchAdmitCard() {
            const appId = document.getElementById('admit-search-id').value.trim();
            const displayArea = document.getElementById('admit-display-area');
            
            if (!appId) {
                showAlert("অনুগ্রহ করে আবেদন আইডি প্রদান করুন।", "danger");
                return;
            }

            try {
                const response = await fetch('/api/applications/' + appId);
                if (response.status === 404) {
                    displayArea.innerHTML = '<div class="text-red-500 font-bold text-center">আবেদন আইডিটি পাওয়া যায়নি! সঠিক আইডি লিখুন।</div>';
                    displayArea.classList.remove('hidden');
                    return;
                }
                const app = await response.json();

                if (app.admit_card_status === 'Pending') {
                    displayArea.innerHTML = \`
                        <div class="bg-amber-50 border border-amber-300 rounded p-4 text-center">
                            <i class="fa fa-clock text-3xl text-amber-600 mb-2"></i>
                            <h4 class="font-bold text-amber-900">প্রবেশপত্র এখনো ইস্যু করা হয়নি!</h4>
                            <p class="text-xs text-amber-700 mt-1">মাদ্রাসার নিয়োগ কমিটি কর্তৃক প্রবেশপত্র প্রকাশিত হওয়ার পর এখান থেকে ডাউনলোড করতে পারবেন। নিয়মিত সাইট ভিজিট করুন।</p>
                        </div>
                    \`;
                } else {
                    displayArea.innerHTML = \`
                        <div class="border border-emerald-600 p-6 rounded bg-white relative print-area">
                            <div class="text-center border-b pb-3 mb-4">
                                <h3 class="font-bold text-lg text-emerald-800">প্রবেশপত্র (Admit Card)</h3>
                                <p class="text-xs text-gray-500">পরীক্ষা নিয়ন্ত্রণ সেল, আবদুর রাজ্জাক দাখিল মাদ্রাসা</p>
                            </div>
                            <div class="flex justify-between items-start mb-4">
                                <div class="text-xs space-y-1">
                                    <p><strong>রোল/আইডি:</strong> <span class="text-sm font-bold text-emerald-800">\${app.id}</span></p>
                                    <p><strong>আবেদনকারী:</strong> \${app.candidate_name}</p>
                                    <p><strong>পিতার নাম:</strong> \${app.father_name}</p>
                                    <p><strong>পদের নাম:</strong> \${app.designation}</p>
                                </div>
                                <img src="\${app.photo}" class="w-20 h-20 border border-gray-300 object-cover">
                            </div>
                            <div class="bg-emerald-50 p-3 rounded border border-emerald-200 text-xs mb-4">
                                <p class="text-emerald-950"><strong>পরীক্ষার তারিখ:</strong> \${app.exam_date}</p>
                                <p class="text-emerald-950"><strong>পরীক্ষার সময়:</strong> \${app.exam_time}</p>
                                <p class="text-emerald-950"><strong>পরীক্ষার স্থান:</strong> \${app.exam_venue}</p>
                            </div>
                            <div class="text-[10px] text-gray-500 leading-relaxed border-t pt-2">
                                <strong>নির্দেশনাবলী:</strong><br>
                                ১. পরীক্ষা শুরুর অন্তত ৩০ মিনিট পূর্বে পরীক্ষাকেন্দ্রে উপস্থিত হতে হবে।<br>
                                ২. পরীক্ষার্থীর এই মূল প্রবেশপত্রটি অবশ্যই সঙ্গে নিয়ে আসতে হবে।
                            </div>
                            <div class="mt-4 text-center no-print">
                                <button onclick="window.print()" class="bg-emerald-800 text-white text-xs px-4 py-2 rounded font-bold hover:bg-emerald-700 transition"><i class="fa fa-print"></i> প্রিন্ট প্রবেশপত্র</button>
                            </div>
                        </div>
                    \`;
                }
                displayArea.classList.remove('hidden');
            } catch (error) {
                showAlert("অনুসন্ধানের সময় একটি ত্রুটি হয়েছে।", "danger");
            }
        }

        // ৬. নিয়োগ পরীক্ষার ফলাফল অনুসন্ধান
        async function searchResult() {
            const appId = document.getElementById('result-search-id').value.trim();
            const displayArea = document.getElementById('result-display-area');

            if (!appId) {
                showAlert("অনুগ্রহ করে আপনার সঠিক আবেদন আইডি দিন।", "danger");
                return;
            }

            try {
                const response = await fetch('/api/results/' + appId);
                if (response.status === 404) {
                    displayArea.innerHTML = '<p class="text-red-500 font-bold">প্রদত্ত আইডি দিয়ে কোনো ফলাফল পাওয়া যায়নি।</p>';
                    displayArea.className = "mt-6 p-4 rounded-lg border border-red-200 bg-red-50 text-center";
                    displayArea.classList.remove('hidden');
                    return;
                }
                const result = await response.json();

                if (result.status === 'Pending') {
                    displayArea.innerHTML = \`
                        <i class="fa fa-clock text-4xl text-amber-500 mb-2"></i>
                        <h4 class="font-bold text-gray-800">পরীক্ষার ফলাফল প্রক্রিয়াধীন!</h4>
                        <p class="text-xs text-gray-500 mt-1">মাদ্রাসার ফলাফল প্রস্তুত হলেই এখানে স্ট্যাটাস প্রকাশিত করা হবে।</p>
                    \`;
                    displayArea.className = "mt-6 p-6 rounded-lg border border-amber-200 bg-amber-50 text-center";
                } else if (result.status === 'Passed') {
                    displayArea.innerHTML = \`
                        <i class="fa fa-check-circle text-5xl text-green-600 mb-2"></i>
                        <h4 class="font-bold text-green-950 text-lg">অভিনন্দন! আপনি উত্তীর্ণ হয়েছেন।</h4>
                        <p class="text-sm text-green-900 mt-1">পদের নাম: <strong>\${result.designation}</strong></p>
                        <p class="text-sm text-green-800 mt-1">প্রাপ্ত নম্বর: \${result.marks || 'প্রকাশিত নয়'}</p>
                        <p class="text-xs text-green-700 mt-2 font-semibold">নিয়োগ বোর্ডের পরবর্তী মৌখিক/পরবর্তী ধাপের জন্য আপনার মোবাইলে যোগাযোগ করা হবে।</p>
                    \`;
                    displayArea.className = "mt-6 p-6 rounded-lg border border-green-200 bg-green-50 text-center";
                } else {
                    displayArea.innerHTML = \`
                        <i class="fa fa-times-circle text-5xl text-gray-400 mb-2"></i>
                        <h4 class="font-bold text-gray-800">দুঃখিত! আপনি উত্তীর্ণ হতে পারেননি।</h4>
                        <p class="text-xs text-gray-500 mt-1">কঠোর পরিশ্রম করুন, সামনে শুভকামনা।</p>
                    \`;
                    displayArea.className = "mt-6 p-6 rounded-lg border border-gray-200 bg-gray-50 text-center";
                }
                displayArea.classList.remove('hidden');
            } catch (error) {
                showAlert("ফলাফল সার্চ করতে সার্ভার সমস্যা হয়েছে।", "danger");
            }
        }

        // ================= ADMIM PANEL OPERATIONS =================

        // ৭. অ্যাডমিন লগইন হ্যান্ডলার
        async function handleAdminLogin(e) {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-pass').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();

                if (result.success) {
                    currentAdminToken = result.token;
                    localStorage.setItem('adminToken', result.token);
                    document.getElementById('logout-btn').classList.remove('hidden');
                    document.getElementById('admin-nav-btn').classList.add('hidden');
                    showAlert("অ্যাডমিন লগইন সফল হয়েছে!", "success");
                    navigate('admin-dashboard');
                } else {
                    showAlert(result.message, "danger");
                }
            } catch (error) {
                showAlert("লগইন করতে সার্ভার ব্যর্থ হয়েছে!", "danger");
            }
        }

        function logout() {
            currentAdminToken = null;
            localStorage.removeItem('adminToken');
            document.getElementById('logout-btn').classList.add('hidden');
            document.getElementById('admin-nav-btn').classList.remove('hidden');
            showAlert("লগআউট সফল হয়েছে।", "success");
            navigate('home');
        }

        // অ্যাডমিন ড্যাশবোর্ড ট্যাব পরিবর্তন
        function toggleAdminSection(sectionId) {
            const sections = ['circular-creator', 'applicants-list'];
            sections.forEach(s => {
                const element = document.getElementById('admin-' + s);
                if (s === sectionId) {
                    element.classList.toggle('hidden');
                } else {
                    element.classList.add('hidden');
                }
            });
        }

        // ৮. অ্যাডমিন সার্কুলার তৈরি করা
        async function createCircular(e) {
            e.preventDefault();
            const data = {
                designation: document.getElementById('circ-designation').value,
                education: document.getElementById('circ-education').value,
                vacancy: document.getElementById('circ-vacancy').value,
                age_limit: document.getElementById('circ-age').value,
                salary: document.getElementById('circ-salary').value,
                deadline: document.getElementById('circ-deadline').value
            };

            try {
                const response = await fetch('/api/circulars', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': currentAdminToken
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (result.success) {
                    showAlert("বিজ্ঞপ্তি প্রকাশ সফল!", "success");
                    document.getElementById('admin-circular-creator').classList.add('hidden');
                    loadAdminDashboard(); // টেবিল আপডেট করবে
                } else {
                    showAlert(result.message, "danger");
                }
            } catch (error) {
                showAlert("সার্কুলার প্রকাশে সার্ভার ব্যর্থতা।", "danger");
            }
        }

        // ৯. অ্যাডমিন ড্যাশবোর্ড রেন্ডারিং
        async function loadAdminDashboard() {
            const tbody = document.getElementById('admin-applicants-table-body');
            const totalBadge = document.getElementById('total-applicants-badge');
            
            try {
                const response = await fetch('/api/admin/applications', {
                    headers: { 'Authorization': currentAdminToken }
                });
                
                if (response.status === 403) {
                    logout();
                    return;
                }

                const applicants = await response.json();
                totalBadge.innerText = "মোট আবেদন: " + applicants.length + " জন";

                if (applicants.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">এখনো কোনো আবেদনপত্র জমা পড়েনি।</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                applicants.forEach(a => {
                    const admitBadge = a.admit_card_status === 'Generated' 
                        ? '<span class="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded font-bold">প্রবেশপত্র প্রস্তুত</span>' 
                        : '<span class="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded font-bold">প্রক্রিয়াধীন</span>';
                    
                    let resultBadge = '<span class="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded">অঘোষিত</span>';
                    if (a.result_status === 'Passed') {
                        resultBadge = '<span class="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded font-bold">উত্তীর্ণ</span>';
                    } else if (a.result_status === 'Failed') {
                        resultBadge = '<span class="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded font-bold">অনুত্তীর্ণ</span>';
                    }

                    tbody.innerHTML += \`
                        <tr class="hover:bg-gray-50">
                            <td class="border border-gray-200 px-3 py-3 font-bold text-emerald-800">\${a.id}</td>
                            <td class="border border-gray-200 px-3 py-3">
                                <div class="font-bold text-gray-800">\${a.candidate_name}</div>
                                <div class="text-xs text-gray-500">\${a.designation}</div>
                            </td>
                            <td class="border border-gray-200 px-3 py-3 font-semibold">\${a.mobile}</td>
                            <td class="border border-gray-200 px-3 py-3 text-center">\${admitBadge}</td>
                            <td class="border border-gray-200 px-3 py-3 text-center">\${resultBadge}</td>
                            <td class="border border-gray-200 px-3 py-3 text-center">
                                <div class="flex gap-1 justify-center">
                                    <button onclick="openAdmitModal('\${a.id}')" class="bg-emerald-700 text-white text-xs px-2 py-1.5 rounded hover:bg-emerald-800" title="প্রবেশপত্র ইস্যু"><i class="fa fa-id-card"></i> প্রবেশপত্র</button>
                                    <button onclick="openResultModal('\${a.id}')" class="bg-indigo-700 text-white text-xs px-2 py-1.5 rounded hover:bg-indigo-800" title="ফলাফল আপডেট"><i class="fa fa-poll"></i> ফলাফল</button>
                                    <button onclick="viewApplicationDetail('\${a.id}')" class="bg-gray-700 text-white text-xs px-2 py-1.5 rounded hover:bg-gray-800" title="বিস্তারিত"><i class="fa fa-eye"></i></button>
                                </div>
                            </td>
                        </tr>
                    \`;
                });
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">ডাটা লোড করতে ভুল হয়েছে।</td></tr>';
            }
        }

        // ১০. প্রবেশপত্র তৈরির মডাল ওপেন
        function openAdmitModal(appId) {
            const content = document.getElementById('modal-content-area');
            content.innerHTML = \`
                <h3 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2"><i class="fa fa-calendar-plus text-emerald-800"></i> পরীক্ষা ও প্রবেশপত্র শিডিউল করুন</h3>
                <p class="text-xs text-emerald-950 mb-3">আবেদনকারী রোল: <strong>\${appId}</strong></p>
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700">পরীক্ষার তারিখ <span class="text-red-500">*</span></label>
                        <input type="text" id="modal-exam-date" placeholder="যেমন: ৩০শে আগস্ট, ২০২৬" class="mt-1 block w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700">পরীক্ষার সময় <span class="text-red-500">*</span></label>
                        <input type="text" id="modal-exam-time" placeholder="যেমন: সকাল ১০:০০ টা" class="mt-1 block w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700">পরীক্ষার ভেন্যু</label>
                        <input type="text" id="modal-exam-venue" value="আবদুর রাজ্জাক দাখিল মাদ্রাসা ক্যাম্পাস" class="mt-1 block w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    </div>
                    <button onclick="submitAdmitSchedule('\${appId}')" class="w-full bg-emerald-800 text-white py-2 rounded font-bold hover:bg-emerald-700 transition mt-2"><i class="fa fa-check"></i> প্রবেশপত্র জেনারেট করুন</button>
                </div>
            \`;
            document.getElementById('admin-action-modal').classList.remove('hidden');
        }

        async function submitAdmitSchedule(appId) {
            const exam_date = document.getElementById('modal-exam-date').value;
            const exam_time = document.getElementById('modal-exam-time').value;
            const exam_venue = document.getElementById('modal-exam-venue').value;

            if (!exam_date || !exam_time) {
                alert("সবগুলো তথ্য ইনপুট করুন!");
                return;
            }

            try {
                const response = await fetch('/api/admin/admit-card', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': currentAdminToken
                    },
                    body: JSON.stringify({ id: appId, exam_date, exam_time, exam_venue })
                });
                const result = await response.json();

                if (result.success) {
                    showAlert("প্রবেশপত্র সফলভাবে প্রকাশিত ও সক্রিয় হয়েছে!", "success");
                    closeAdminModal();
                    loadAdminDashboard();
                }
            } catch (e) {
                showAlert("প্রবেশপত্র প্রকাশে ভুল হয়েছে।", "danger");
            }
        }

        // ১১. ফলাফল ঘোষণার মডাল
        function openResultModal(appId) {
            const content = document.getElementById('modal-content-area');
            content.innerHTML = \`
                <h3 class="text-lg font-bold text-gray-800 mb-4 border-b pb-2"><i class="fa fa-edit text-emerald-800"></i> ফলাফল নির্ধারণ করুন</h3>
                <p class="text-xs text-emerald-950 mb-3">আবেদনকারী রোল: <strong>\${appId}</strong></p>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700">ফলাফল সিদ্ধান্ত</label>
                        <select id="modal-result-status" class="mt-1 block w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                            <option value="Passed">Passed (উত্তীর্ণ)</option>
                            <option value="Failed">Failed (অনুত্তীর্ণ)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700">প্রাপ্ত নম্বর / মন্তব্য (ঐচ্ছিক)</label>
                        <input type="text" id="modal-result-marks" placeholder="যেমন: লিখিত- ৪৫, ভাইভা- ১০" class="mt-1 block w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    </div>
                    <button onclick="submitResultPublish('\${appId}')" class="w-full bg-emerald-800 text-white py-2 rounded font-bold hover:bg-emerald-700 transition"><i class="fa fa-save"></i> ফলাফল সেভ করুন</button>
                </div>
            \`;
            document.getElementById('admin-action-modal').classList.remove('hidden');
        }

        async function submitResultPublish(appId) {
            const status = document.getElementById('modal-result-status').value;
            const marks = document.getElementById('modal-result-marks').value;

            try {
                const response = await fetch('/api/admin/publish-result', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': currentAdminToken
                    },
                    body: JSON.stringify({ id: appId, status, marks })
                });
                const result = await response.json();

                if (result.success) {
                    showAlert("ফলাফল আপডেট সফল হয়েছে!", "success");
                    closeAdminModal();
                    loadAdminDashboard();
                }
            } catch (e) {
                showAlert("ফলাফল আপডেট করতে ব্যর্থ হয়েছে।", "danger");
            }
        }

        // ১২. আবেদনকারীর সম্পূর্ণ প্রোফাইল বা কপি দেখা
        function viewApplicationDetail(appId) {
            closeAdminModal();
            loadApplicantCopy(appId);
        }

        function closeAdminModal() {
            document.getElementById('admin-action-modal').classList.add('hidden');
        }

        // পেজ লোড হবার পর স্টার্টআপ ফাংশন
        window.onload = function() {
            // যদি পূর্বে সেশন সেভ থাকে
            if (currentAdminToken) {
                document.getElementById('logout-btn').classList.remove('hidden');
                document.getElementById('admin-nav-btn').classList.add('hidden');
            }
            loadCirculars();
        };
    </script>
</body>
</html>
    `);
});

// সার্ভার চালু করা
app.listen(PORT, () => {
    console.log(`Server is running beautifully on http://localhost:${PORT}`);
});

