import { Router } from 'express';
import tperpormManagement from '../model/tperpormManagement.js';

const router = Router();

/**
 * 성능 테스트 데이터 업로드
 * POST /perf_upload
 */
router.post('/perf_upload', async function (req, res, next) {
    try {
        const data = req.body;
        // console.log("Received data:", data);

        if (!data.APID || !data.SID || !data.TID) {
            return res.status(400).json({ success: false, message: "필수 항목이 누락되었습니다 (APID, SID, TID)" });
        }

        const result = await tperpormManagement.upsertPerformanceData(data);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * 성능 테스트 데이터 삭제
 * DELETE /perf_del
 */
router.delete('/perf_del', async (req, res) => {
    try {
        const data = req.body; // Expecting array of objects with PKEY
        // console.log("Delete request data:", data);

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid data format. Expected non-empty array." });
        }

        const pkeys = data.map(item => item.PKEY).filter(pkey => pkey); // Extract PKEYs

        if (pkeys.length === 0) {
            return res.status(400).json({ success: false, message: "No valid PKEYs provided." });
        }

        const result = await tperpormManagement.deletePerformanceData(pkeys);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});



/**
 * 성능 테스트 데이터 조회
 * GET /perf_list
 */
router.get('/perf_list', async (req, res) => {
    try {
        const searchtxt = req.query.searchtxt;
        const searchCondition = req.query.searchCondition;
        const result = await tperpormManagement.getPerformanceList(searchtxt, searchCondition);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

export default router;
