const { calculatePFI } = require("../services/pfiService");

async function getPFI(req,res){

try{

const data = req.body;

const score = calculatePFI(data);

res.json({
PFI_score: score
});

}catch(error){

console.log(error);

res.status(500).json({
error:"PFI calculation failed"
});

}

}

module.exports = { getPFI };