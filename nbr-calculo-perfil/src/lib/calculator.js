/**
 * calculator.js - Implementação dos cálculos da NBR 8800 para perfis Gerdau W
 */

export function calculateProfile(profile, loads, material) {
  const Msd = parseFloat(loads.Msd) || 0;
  const Vsd = parseFloat(loads.Vsd) || 0;
  const Nsd = parseFloat(loads.Nsd) || 0;
  const Lb = parseFloat(loads.Lb) || 160;
  const Lx = parseFloat(loads.Lx) || Lb;
  const Ly = parseFloat(loads.Ly) || Lb;
  const fy = material.fy;
  const E = material.E;
  const gamma_a1 = material.gamma_a1;
  const Kv = material.Kv;

  const {
    d, bf, tw, tf, h, d_linha, Area,
    Ix, Wx, rx, Zx,
    Iy, Wy, ry, Zy,
    It, Cw
  } = profile;

  const realCw = Cw; 
  const results = {};

  // 1. Zx mín requerido
  // Msd (kN.m) = Msd * 100 (kN.cm)
  // Zx_min = (Msd * 100 * gamma_a1) / (fy/10)
  const Zx_min = (Msd * 100 * gamma_a1) / (fy / 10);
  results.Zx_min = Zx_min;

  // 2. CAPACIDADE RELATIVA AO MOMENTO
  // Mrd_max (kN.cm) = (1.5 * Wx * (fy / 10)) / gamma_a1
  const Mrd_max_cm = (1.5 * Wx * (fy / 10)) / gamma_a1;
  const Mrd_max = Mrd_max_cm / 100; // em kN.m
  results.Mrd_max_cm = Mrd_max_cm;
  results.Mrd_max = Mrd_max;

  // 3. CLASSIFICAÇÃO DO PERFIL (Anexo D)
  const class_lambda = d_linha / tw;
  const class_lambda_r = 5.7 * Math.sqrt(E / fy);
  const esbelto = class_lambda <= class_lambda_r ? 'Não' : 'Sim';
  results.Classificacao = {
    lambda: class_lambda,
    lambda_r: class_lambda_r,
    esbelto
  };

  // 4.1 FLAMBAGEM LATERAL COM TORÇÃO (FLT)
  const beta1 = ((0.7 * fy) * Wx) / (E * It);
  const Cb = 1;
  const Mpl_FLT_cm = (fy / 10) * Zx;
  const Mr_FLT_cm = 0.7 * (fy / 10) * Wx;
  const lambda_FLT = Lb / ry;
  const lambda_p_FLT = 1.76 * Math.sqrt(E / fy);
  
  const termo_raiz_FLT = 1 + Math.sqrt(1 + (27 * realCw * Math.pow(beta1, 2)) / (Math.pow(Cb, 2) * Iy));
  const lambda_r_FLT = ((1.38 * Cb * Math.sqrt(Iy * It)) / (ry * It * beta1)) * Math.sqrt(termo_raiz_FLT);
  const Mrc_cm = (Cb * Math.pow(Math.PI, 2) * (E / 10) * Iy / Math.pow(Lb, 2)) * Math.sqrt((realCw / Iy) * (1 + 0.039 * (It * Math.pow(Lb, 2)) / realCw));

  let Mrd_FLT_cm = 0;
  if (lambda_FLT <= lambda_p_FLT) {
    Mrd_FLT_cm = Mpl_FLT_cm / gamma_a1;
  } else if (lambda_FLT > lambda_p_FLT && lambda_FLT <= lambda_r_FLT) {
    Mrd_FLT_cm = (1 / gamma_a1) * (Mpl_FLT_cm - (Mpl_FLT_cm - Mr_FLT_cm) * ((lambda_FLT - lambda_p_FLT) / (lambda_r_FLT - lambda_p_FLT)));
  } else {
    Mrd_FLT_cm = Mrc_cm / gamma_a1;
  }
  
  let Mrd_FLT = Mrd_FLT_cm / 100;
  if (Mrd_FLT > Mrd_max) Mrd_FLT = Mrd_max;

  results.FLT = {
    beta1, Cb, Mpl: Mpl_FLT_cm, Mr: Mr_FLT_cm, Mrc: Mrc_cm,
    lambda: lambda_FLT, lambda_p: lambda_p_FLT, lambda_r: lambda_r_FLT,
    Mrd_formula1: Mpl_FLT_cm / gamma_a1,
    Mrd_formula2: (1 / gamma_a1) * (Mpl_FLT_cm - (Mpl_FLT_cm - Mr_FLT_cm) * ((lambda_FLT - lambda_p_FLT) / (lambda_r_FLT - lambda_p_FLT))),
    Mrd_formula3: Mrc_cm / gamma_a1,
    Mrd: Mrd_FLT,
    pass: Mrd_FLT >= Msd
  };

  // 4.2 FLAMBAGEM LATERAL DA MESA (FLM)
  const Mpl_FLM_cm = (fy / 10) * Zx;
  const Mr_FLM_cm = 0.7 * (fy / 10) * Wx;
  const lambda_FLM = (bf / 2) / tf;
  const lambda_p_FLM = 0.38 * Math.sqrt(E / fy);
  const lambda_r_FLM = 0.83 * Math.sqrt(E / (0.7 * fy));

  const Mcr_FLM_cm = ((0.69 * (E / 10)) / Math.pow(lambda_FLM, 2)) * Wx;

  let Mrd_FLM_cm = 0;
  if (lambda_FLM <= lambda_p_FLM) {
    Mrd_FLM_cm = Mpl_FLM_cm / gamma_a1;
  } else if (lambda_FLM > lambda_p_FLM && lambda_FLM <= lambda_r_FLM) {
    Mrd_FLM_cm = (1 / gamma_a1) * (Mpl_FLM_cm - (Mpl_FLM_cm - Mr_FLM_cm) * ((lambda_FLM - lambda_p_FLM) / (lambda_r_FLM - lambda_p_FLM)));
  } else {
    Mrd_FLM_cm = Mcr_FLM_cm / gamma_a1;
  }
  
  let Mrd_FLM = Mrd_FLM_cm / 100;
  if (Mrd_FLM > Mrd_max) Mrd_FLM = Mrd_max;

  results.FLM = {
    Mcr: Mcr_FLM_cm, Mpl: Mpl_FLM_cm, Mr: Mr_FLM_cm,
    lambda: lambda_FLM, lambda_p: lambda_p_FLM, lambda_r: lambda_r_FLM,
    Mrd_formula1: Mpl_FLM_cm / gamma_a1,
    Mrd_formula2: (1 / gamma_a1) * (Mpl_FLM_cm - (Mpl_FLM_cm - Mr_FLM_cm) * ((lambda_FLM - lambda_p_FLM) / (lambda_r_FLM - lambda_p_FLM))),
    Mrd_formula3: Mcr_FLM_cm / gamma_a1,
    Mrd: Mrd_FLM,
    pass: Mrd_FLM >= Msd
  };

  // 4.3 FLAMBAGEM LATERAL DA ALMA (FLA)
  const Mpl_FLA_cm = (fy / 10) * Zx;
  const Mr_FLA_cm = (fy / 10) * Wx; 
  const lambda_FLA = d_linha / tw;
  const lambda_p_FLA = 3.76 * Math.sqrt(E / fy);
  const lambda_r_FLA = 5.70 * Math.sqrt(E / fy);

  let Mrd_FLA_cm = 0;
  if (lambda_FLA <= lambda_p_FLA) {
    Mrd_FLA_cm = Mpl_FLA_cm / gamma_a1;
  } else if (lambda_FLA > lambda_p_FLA && lambda_FLA <= lambda_r_FLA) {
    Mrd_FLA_cm = (1 / gamma_a1) * (Mpl_FLA_cm - (Mpl_FLA_cm - Mr_FLA_cm) * ((lambda_FLA - lambda_p_FLA) / (lambda_r_FLA - lambda_p_FLA)));
  } else {
    Mrd_FLA_cm = 0; 
  }
  
  let Mrd_FLA = Mrd_FLA_cm / 100;
  if (Mrd_FLA > Mrd_max && Mrd_FLA !== 0) Mrd_FLA = Mrd_max;

  results.FLA = {
    Mpl: Mpl_FLA_cm, Mr: Mr_FLA_cm,
    lambda: lambda_FLA, lambda_p: lambda_p_FLA, lambda_r: lambda_r_FLA,
    Mrd_formula1: Mpl_FLA_cm / gamma_a1,
    Mrd_formula2: (1 / gamma_a1) * (Mpl_FLA_cm - (Mpl_FLA_cm - Mr_FLA_cm) * ((lambda_FLA - lambda_p_FLA) / (lambda_r_FLA - lambda_p_FLA))),
    Mrd_formula3: null,
    Mrd: Mrd_FLA,
    pass: Mrd_FLA >= Msd
  };

  // 5. CÁLCULO DE RESISTÊNCIA AO CISALHAMENTO
  const Aw = d * tw;
  const Vpl = 0.6 * Aw * (fy / 10);
  const lambda_V = d_linha / tw;
  const lambda_p_V = 1.1 * Math.sqrt((Kv * E) / fy);
  const lambda_r_V = 1.37 * Math.sqrt((Kv * E) / fy);

  let Vrd = 0;
  if (lambda_V <= lambda_p_V) {
    Vrd = Vpl / gamma_a1;
  } else if (lambda_V > lambda_p_V && lambda_V <= lambda_r_V) {
    Vrd = (lambda_p_V / lambda_V) * (Vpl / gamma_a1);
  } else {
    Vrd = 1.24 * Math.pow(lambda_p_V / lambda_V, 2) * (Vpl / gamma_a1);
  }

  results.Shear = {
    Aw, Vpl, Kv,
    lambda: lambda_V, lambda_p: lambda_p_V, lambda_r: lambda_r_V,
    Vrd_formula1: Vpl / gamma_a1,
    Vrd_formula2: (lambda_p_V / lambda_V) * (Vpl / gamma_a1),
    Vrd_formula3: 1.24 * Math.pow(lambda_p_V / lambda_V, 2) * (Vpl / gamma_a1),
    Vrd: Vrd,
    pass: Vrd >= Vsd
  };

  // 6. RESISTÊNCIA À TRAÇÃO
  const NtRd = (Area * fy) / gamma_a1;
  const isTension = Nsd > 0;

  results.Tension = {
    NtRd,
    pass: isTension ? (NtRd >= Math.abs(Nsd)) : true
  };

  // 7. RESISTÊNCIA À COMPRESSÃO
  const G_val = 7700;
  
  const Nex = (Math.pow(Math.PI, 2) * E * Ix) / Math.pow(Lx, 2);
  const Ney = (Math.pow(Math.PI, 2) * E * Iy) / Math.pow(Ly, 2);
  const r0_squared = Math.pow(rx, 2) + Math.pow(ry, 2);
  const Lz = Ly; 
  const Nez = ((Math.pow(Math.PI, 2) * E * realCw) / Math.pow(Lz, 2) + G_val * It) / r0_squared;
  
  const Ne = Math.min(Nex, Ney, Nez);
  const lambda0 = Math.sqrt((Area * fy) / Ne);
  
  let chi = 1;
  if (lambda0 <= 1.5) {
    chi = Math.pow(0.658, Math.pow(lambda0, 2));
  } else {
    chi = 0.877 / Math.pow(lambda0, 2);
  }

  // Flambagem Local (Aef)
  const b_AL = bf / 2;
  const t_AL = tf;
  const bt_AL = b_AL / t_AL;
  const bt_lim_AL = 0.56 * Math.sqrt(E / fy);
  const c1_AL = 0.22;
  const c2_AL = 1.49;
  const sigma_el_AL = Math.pow(c2_AL * (bt_lim_AL / bt_AL), 2) * fy;
  const lambda_AL = bt_lim_AL / Math.sqrt(chi);
  
  let bef_AL = b_AL;
  if (bt_AL > lambda_AL || bt_AL > bt_lim_AL) {
    bef_AL = b_AL * (1 - c1_AL * Math.sqrt(sigma_el_AL / (chi * fy))) * Math.sqrt(sigma_el_AL / (chi * fy));
    if (bef_AL > b_AL) bef_AL = b_AL;
  }

  const b_AA = d_linha;
  const t_AA = tw;
  const bt_AA = b_AA / t_AA;
  const bt_lim_AA = 1.49 * Math.sqrt(E / fy);
  const c1_AA = 0.18;
  const c2_AA = 1.31;
  const sigma_el_AA = Math.pow(c2_AA * (bt_lim_AA / bt_AA), 2) * fy;
  const lambda_AA = bt_lim_AA / Math.sqrt(chi);
  
  let bef_AA = b_AA;
  if (bt_AA > lambda_AA || bt_AA > bt_lim_AA) {
    bef_AA = b_AA * (1 - c1_AA * Math.sqrt(sigma_el_AA / (chi * fy))) * Math.sqrt(sigma_el_AA / (chi * fy));
    if (bef_AA > b_AA) bef_AA = b_AA;
  }

  let Aef = Area - (4 * Math.max(0, b_AL - bef_AL) * t_AL + Math.max(0, b_AA - bef_AA) * t_AA);
  if (Aef > Area) Aef = Area;

  const NcRd = (chi * Aef * fy) / gamma_a1;
  const isCompression = Nsd < 0;

  results.Compression = {
    Nex, Ney, Nez, Ne, lambda0, chi, r0_squared,
    AL: { b: b_AL, t: t_AL, bt: bt_AL, bt_lim: bt_lim_AL, c1: c1_AL, c2: c2_AL, sigma_el: sigma_el_AL, lambda_lim: lambda_AL, bef: bef_AL },
    AA: { b: b_AA, t: t_AA, bt: bt_AA, bt_lim: bt_lim_AA, c1: c1_AA, c2: c2_AA, sigma_el: sigma_el_AA, lambda_lim: lambda_AA, bef: bef_AA },
    Aef, NcRd,
    pass: isCompression ? (NcRd >= Math.abs(Nsd)) : true
  };

  // 8. ESFORÇOS COMBINADOS
  let combinedRatio = 0;
  const Mrdx = Math.min(Mrd_FLT, Mrd_FLM, Mrd_FLA || Infinity);
  
  if (isTension) {
    combinedRatio = (Nsd / NtRd) + (Msd / Mrdx);
  } else if (isCompression) {
    const Ncsd = Math.abs(Nsd);
    if ((Ncsd / NcRd) >= 0.2) {
      combinedRatio = (Ncsd / NcRd) + (8 / 9) * (Msd / Mrdx);
    } else {
      combinedRatio = (Ncsd / (2 * NcRd)) + (Msd / Mrdx);
    }
  } else {
    combinedRatio = (Msd / Mrdx);
  }

  results.Combined = {
    ratio: combinedRatio,
    pass: combinedRatio <= 1.0
  };

  results.min_Mrd = Mrdx;
  results.overallPass = results.FLT.pass && results.FLM.pass && results.FLA.pass && results.Shear.pass && results.Tension.pass && results.Compression.pass && results.Combined.pass;

  return results;
}
