// Minimal, clean JS to fetch API, filter for Jessica Taylor, and render UI + Chart.js
const API_URL = "https://fedskillstest.coalitiontechnologies.workers.dev/";
// Basic Auth: username 'coalition', password 'skills-test'
const authHeader = "Basic " + btoa("coalition:skills-test");

async function fetchPatients(){
  const res = await fetch(API_URL, {
    headers: { "Authorization": authHeader }
  });
  if(!res.ok) throw new Error("API request failed: " + res.status);
  return res.json();
}

function selectJessica(patients){
  return patients.find(p => p.name === "Jessica Taylor");
}

function fillProfile(p){
  // avatar
  const avatar = document.getElementById("patientAvatar");
  if (avatar && p.profile_picture) avatar.style.backgroundImage = `url(${p.profile_picture})`;

  // basics
  document.getElementById("patientName").textContent = p.name ?? "Jessica Taylor";
  document.getElementById("patientGender").textContent = p.gender ?? "—";
  document.getElementById("patientAge").textContent = (p.age ? p.age + " years" : "—");
  document.getElementById("patientDob").textContent = p.date_of_birth ?? "—";
  document.getElementById("patientPhone").textContent = p.phone_number ?? "—";
  document.getElementById("patientEmergency").textContent = p.emergency_contact ?? "—";
  document.getElementById("patientInsurance").textContent = p.insurance_type ?? "—";
  document.getElementById("patientBloodType").textContent = p.blood_type ?? "—";
}

function latestVitalsFromHistory(dh){
  // Use most recent entry by (year, month order as appears)
  if(!Array.isArray(dh) || dh.length === 0) return null;
  // sort by year then by custom month index if possible
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const sorted = [...dh].sort((a,b)=>{
    if (a.year !== b.year) return b.year - a.year;
    return (months.indexOf(b.month) - months.indexOf(a.month));
  });
  return sorted[0];
}

function fillVitals(latest){
  const list = document.getElementById("vitalsList");
  list.innerHTML = "";
  if(!latest){
    list.innerHTML = "<li>No vitals available.</li>";
    return;
  }
  const bpSys = latest?.blood_pressure?.systolic?.value ?? "—";
  const bpDia = latest?.blood_pressure?.diastolic?.value ?? "—";
  const hr = latest?.heart_rate?.value ?? "—";
  const rr = latest?.respiratory_rate?.value ?? "—";
  const temp = latest?.temperature?.value ?? "—";

  const items = [
    ["Blood Pressure", `${bpSys}/${bpDia} mmHg`],
    ["Heart Rate", `${hr} bpm`],
    ["Respiratory Rate", `${rr} bpm`],
    ["Temperature", `${temp} °F`],
  ];

  for(const [label,value] of items){
    const li = document.createElement("li");
    li.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
    list.appendChild(li);
  }
}

function fillDiagnosisList(dh){
  const ol = document.getElementById("diagnosisList");
  ol.innerHTML = "";
  if(!Array.isArray(dh) || dh.length === 0){
    ol.innerHTML = "<li>No diagnosis history found.</li>";
    return;
  }
  dh.slice(0,6).forEach(entry=>{
    const sys = entry?.blood_pressure?.systolic?.value ?? "—";
    const dia = entry?.blood_pressure?.diastolic?.value ?? "—";
    const li = document.createElement("li");
    li.textContent = `${entry.month} ${entry.year} — BP ${sys}/${dia} mmHg, HR ${entry?.heart_rate?.value ?? "—"} bpm`;
    ol.appendChild(li);
  });
}

function renderBPChart(ctx, dh){
  if(!Array.isArray(dh) || dh.length === 0) return;
  // Group by year, average the values across months for a simple "by year" view
  const byYear = {};
  dh.forEach(e=>{
    const y = e.year;
    const s = e?.blood_pressure?.systolic?.value;
    const d = e?.blood_pressure?.diastolic?.value;
    if(typeof y !== "number" || s == null || d == null) return;
    if(!byYear[y]) byYear[y] = {sys:[], dia:[]};
    byYear[y].sys.push(s);
    byYear[y].dia.push(d);
  });
  const years = Object.keys(byYear).sort();
  const systolic = years.map(y => avg(byYear[y].sys));
  const diastolic = years.map(y => avg(byYear[y].dia));

  new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Systolic",
          data: systolic,
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.35
        },
        {
          label: "Diastolic",
          data: diastolic,
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels:{ usePointStyle:true } },
        tooltip: { mode: "index", intersect: false }
      },
      scales: {
        x: { title:{ display:true, text:"Year" }, grid:{ color:"rgba(255,255,255,0.06)"} },
        y: { title:{ display:true, text:"mmHg" }, grid:{ color:"rgba(255,255,255,0.06)" } }
      }
    }
  });
}

function avg(arr){ 
  const n = arr.length || 1;
  return Math.round(arr.reduce((a,b)=>a+b,0)/n);
}

(async function init(){
  try{
    const patients = await fetchPatients();
    const jessica = selectJessica(patients);
    if(!jessica) throw new Error("Jessica Taylor not found in API data");
    fillProfile(jessica);

    const latest = latestVitalsFromHistory(jessica.diagnosis_history || []);
    fillVitals(latest);
    fillDiagnosisList(jessica.diagnosis_history || []);

    const ctx = document.getElementById("bpChart").getContext("2d");
    renderBPChart(ctx, jessica.diagnosis_history || []);
  }catch(err){
    console.error(err);
    alert("Failed to load patient data. See console for details.");
  }
})();