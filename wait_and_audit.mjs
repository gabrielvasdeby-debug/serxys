import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = "https://medymhlxzfzfkjvkkexa.supabase.co";

async function ping() {
  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/");
    if (res.status === 200 || res.status === 404 || res.status === 401) {
        return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function run() {
  console.log("Aguardando o Supabase despertar...");
  let isUp = false;
  let attempts = 0;
  while (!isUp && attempts < 60) {
    isUp = await ping();
    if (isUp) {
      console.log("Supabase ONLINE! Rodando auditoria...");
      try {
        const output = execSync("node audit_supabase.mjs", { encoding: "utf8" });
        console.log(output);
      } catch (e) {
        console.error("Failed to run audit script:", e.stdout || e.message);
      }
      return;
    }
    attempts++;
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log("Timeout atingido e o Supabase não despertou.");
}

run();
