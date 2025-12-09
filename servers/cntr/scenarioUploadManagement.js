import { Router } from 'express';
import tmigscene from '../model/tmigscene.js';
import tmigcode from '../model/tmigcode.js';

const router = Router();

// 조회 (검색 포함)
router.get('/scenario_list', async function (req, res, next) {
    const { gubun, searchtxt } = req.query;

    let rdata;
    // searchtxt가 존재하면 검색, 없으면 전체 리스트 (혹은 전체 리스트가 기본)
    // tmigscene.js의 ttmigscenesearch는 검색 조건이 있을 때 사용
    // tmigscene.js의 ttmigscenelist는 전체 리스트 조회
    if (searchtxt) {
        rdata = await tmigscene.ttmigscenesearch({ gubun, searchtxt });
    } else {
        rdata = await tmigscene.ttmigscenelist();
    }
    res.json(rdata);
});

// 이행 데이터 조회 (select box용)
router.get('/scenario_sel_data', async function (req, res, next) {
    const rdata = await tmigcode.ttranslist();
    // Front-end expects 'desc' but tmigcode returns 'midnm'. 
    // We might need to map it or fix front-end. 
    // For now, let's map 'midnm' to 'desc' to support existing front-end logic if needed, 
    // or just return as is. Svelte uses item.desc. 
    // Let's modify the response to include 'desc' alias for 'midnm' just in case.
    const mappedData = rdata.map(item => ({
        ...item,
        desc: item.midnm // Alias midnm to desc
    }));
    res.json(mappedData);
});

// 삭제
router.delete('/scenario_del', async function (req, res, next) {
    // req.body is the list of items to delete
    const result = await tmigscene.ttmigscenedel(JSON.stringify(req.body));
    if (result === 1) {
        res.status(200).json({ rdata: 1 });
    } else {
        res.status(200).json({ rdata: 0 });
    }
});

// 저장
router.post('/scenario_save', async function (req, res, next) {
    const result = await tmigscene.ttmigscenesave(JSON.stringify(req.body));
    if (result === 1) {
        res.status(200).json({ rdata: 1 });
    } else {
        res.status(200).json({ rdata: 0 });
    }
});

export default router;
