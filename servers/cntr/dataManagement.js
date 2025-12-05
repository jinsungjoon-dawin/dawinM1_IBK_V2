import { Router } from 'express';
import tdata from '../model/tdata.js';
import tdatacode from '../model/tdatacode.js';

const router = Router();

/**
 * 리스트 조회
 */
router.get('/', async function (req, res, next) {
    const rdata = await tdata.tdata_list(req.query);
    res.json(rdata);
});

/**
 * 저장 (등록/수정)
 */
router.post('/save', async function (req, res, next) {
    try {
        const list = req.body;
        let successCount = 0;

        if (Array.isArray(list)) {
            for (const item of list) {
                if (item.pkey && item.pkey > 0) {
                    await tdata.tdata_update(item);
                } else {
                    await tdata.tdata_insert(item);
                }
                successCount++;
            }
        } else {
            if (list.pkey && list.pkey > 0) {
                await tdata.tdata_update(list);
            } else {
                await tdata.tdata_insert(list);
            }
            successCount++;
        }

        res.status(200).json({ "rdata": 1, "count": successCount });
    } catch (e) {
        console.error(e);
        res.status(500).json({ "rdata": 0, "error": e.message });
    }
});

/**
 * 삭제
 */
router.delete('/del', async function (req, res, next) {
    try {
        const list = req.body;
        let successCount = 0;

        if (Array.isArray(list)) {
            for (const item of list) {
                await tdata.tdata_delete(item);
                successCount++;
            }
        } else {
            await tdata.tdata_delete(list);
            successCount++;
        }

        res.status(200).json({ "rdata": 1, "count": successCount });
    } catch (e) {
        console.error(e);
        res.status(500).json({ "rdata": 0, "error": e.message });
    }
});

/**
 * TDataCode 리스트 조회
 */
router.get('/code', async function (req, res, next) {
    const rdata = await tdatacode.tdatalist();
    res.json(rdata);
});

/**
 * TDataCode 저장 (등록/수정)
 */
router.post('/code/save', async function (req, res, next) {
    try {
        const item = req.body;
        if (item.did && item.did > 0) {
            await tdatacode.update(item);
        } else {
            await tdatacode.insert(item);
        }
        res.status(200).json({ "rdata": 1 });
    } catch (e) {
        console.error(e);
        res.status(500).json({ "rdata": 0, "error": e.message });
    }
});

/**
 * TDataCode 삭제
 */
router.delete('/code/del', async function (req, res, next) {
    try {
        const item = req.body;
        await tdatacode.delete(item);
        res.status(200).json({ "rdata": 1 });
    } catch (e) {
        console.error(e);
        res.status(500).json({ "rdata": 0, "error": e.message });
    }
});

export default router;
