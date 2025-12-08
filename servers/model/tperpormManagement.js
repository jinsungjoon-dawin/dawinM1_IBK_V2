import mondb from '../db/dbconn.js';

const tperpormManagement = {
    /**
     * 성능 테스트 데이터 업로드 (Upsert)
     * tapid, tsid, tperfcode, tperftest 순차적 처리
     */
    upsertPerformanceData: async (data) => {
        let conn;
        try {
            conn = await mondb.getConnection();
            await conn.beginTransaction();

            // 1. tapid (업무) - APID 기준 Select -> Insert (No Update)
            const [tapidRows] = await conn.query('SELECT APID FROM tapid WHERE APID = ?', [data.APID]);
            if (tapidRows.length === 0) {
                // Insert Only
                const sqlTapidInsert = 'INSERT INTO tapid (APID, APNM) VALUES (?, ?)';
                await conn.query(sqlTapidInsert, [data.APID, data.APNM]);
            }

            // 2. tsid (서비스) - SID 기준 Select -> Insert (No Update)
            const [tsidRows] = await conn.query('SELECT SID FROM tsid WHERE SID = ?', [data.SID]);
            if (tsidRows.length === 0) {
                // Insert Only
                const sqlTsidInsert = 'INSERT INTO tsid (SID, APID, SVCNM, `DESC`) VALUES (?, ?, ?, ?)';
                await conn.query(sqlTsidInsert, [data.SID, data.APID, data.SVCNM, data.DESC]);
            }

            // 3. tperfcode (테스트 차수) - TID 기준 Select -> Insert (No Update)
            const curDate = new Date();
            const startDt = data.startDt || curDate;
            const lastDt = data.lastDt || curDate;
            const asisDt = data.asisDt || curDate;

            const [tperfcodeRows] = await conn.query('SELECT TID FROM tperfcode WHERE TID = ?', [data.TID]);
            if (tperfcodeRows.length === 0) {
                // Insert Only
                const sqlTperfcodeInsert = `
                    INSERT INTO tperfcode (TID, SEQ, TNAME, gb, startDt, lastDt, asisDt)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                await conn.query(sqlTperfcodeInsert, [
                    data.TID,
                    data.SEQ,
                    data.TNAME,
                    data.gb,
                    startDt,
                    lastDt,
                    asisDt
                ]);
            }

            // 4. tperftest (성능 결과) - PKEY 기준 Select -> Insert/Update
            // PKEY로 조회 -> 0보다 크면 Update, 아니면 Insert
            // 주의: data.PKEY가 없으면 Insert로 처리됨 (AUTO_INCREMENT 등으로 가정하지 않고 사용자 요청대로 PKEY 포함 Insert)

            // PKEY가 값이 있을 때만 조회 시도 (빈 값이면 신규로 간주)
            if (data.PKEY) {
                const sqlTperftestUpdate = `
                    UPDATE tperftest SET 
                        TSTIME = ?,
                        STIME = ?,
                        ETIME = ?,
                        SFLAG = ?,
                        SVCTIME = ?,
                        STIME_ASIS = ?,
                        ETIME_ASIS = ?,
                        SVCTIME_ASIS = ?,
                        REGDT = NOW()
                    WHERE PKEY = ?
                `;
                await conn.query(sqlTperftestUpdate, [
                    data.TSTIME || null,
                    data.STIME || null,
                    data.ETIME || null,
                    data.SFLAG || 0,
                    data.SVCTIME || 0,
                    data.STIME_ASIS || null,
                    data.ETIME_ASIS || null,
                    data.SVCTIME_ASIS || 0,
                    data.PKEY
                ]);
            } else {
                // Insert
                const sqlTperftestInsert = `
                    INSERT INTO tperftest (
                         TID, SID, TSTIME, STIME, ETIME, SFLAG, SVCTIME,
                        STIME_ASIS, ETIME_ASIS, SVCTIME_ASIS, REGDT
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `;
                await conn.query(sqlTperftestInsert, [
                    data.TID,
                    data.SID,
                    data.TSTIME || null,
                    data.STIME || null,
                    data.ETIME || null,
                    data.SFLAG || 0,
                    data.SVCTIME || 0,
                    data.STIME_ASIS || null,
                    data.ETIME_ASIS || null,
                    data.SVCTIME_ASIS || 0
                ]);
            }

            await conn.commit();
            return { success: true, message: "데이터가 성공적으로 저장되었습니다" };

        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Transaction Error:", err);
            throw err;
        } finally {
            if (conn) conn.release();
        }
    },
    /**
     * 성능 테스트 데이터 조회 (List)
     */
    getPerformanceList: async (searchtxt, searchCondition) => {
        let conn;
        try {
            conn = await mondb.getConnection();
            let whereClause = "";
            let params = [];

            if (searchtxt) {
                if (searchCondition === "APID") {
                    whereClause = "AND ta.APID LIKE ?";
                } else if (searchCondition === "TID") {
                    whereClause = "AND tp.TID LIKE ?";
                } else if (searchCondition === "TNAME") {
                    whereClause = "AND tc.TNAME LIKE ?";
                } else {
                    // Default to SVCNM
                    whereClause = "WHERE ts.SVCNM LIKE ?";
                }
                params.push(`%${searchtxt}%`);
            }

            const sql = `
                select
                tc.TID, 
                tc.SEQ, 
                tc.TNAME, 
                tc.gb,
                ta.APID, 
                ta.APNM,
                ts.SID,
                ts.SVCNM, 
                ts.\`DESC\`,
                DATE_FORMAT(tp.TSTIME, '%Y-%m-%d %H:%i:%s') as TSTIME,
                DATE_FORMAT(tp.STIME, '%Y-%m-%d %H:%i:%s') as STIME,
                DATE_FORMAT(tp.ETIME, '%Y-%m-%d %H:%i:%s') as ETIME,
                tp.SFLAG, 
                tp.SVCTIME,
                DATE_FORMAT(tp.STIME_ASIS, '%Y-%m-%d %H:%i:%s') as STIME_ASIS,
                DATE_FORMAT(tp.ETIME_ASIS, '%Y-%m-%d %H:%i:%s') as ETIME_ASIS,
                tp.SVCTIME_ASIS,
                tp.PKEY,
                'old' as flag
                FROM tperftest tp
                JOIN tsid ts ON tp.SID = ts.SID
                JOIN tapid ta ON ts.APID = ta.APID
                JOIN tperfcode tc ON tp.TID = tc.TID
                WHERE tc.gb = '3'
                ${whereClause}
                order by ta.apid, tp.tid, ts.svcnm
                `;
            const rows = await conn.query(sql, params);
            // Format dates
            // return rows.map(row => ({
            //     ...row,
            //     TSTIME: row.TSTIME ? new Date(row.TSTIME).toLocaleString() : '',
            //     STIME: row.STIME ? new Date(row.STIME).toLocaleString() : '',
            //     ETIME: row.ETIME ? new Date(row.ETIME).toLocaleString() : '',
            //     STIME_ASIS: row.STIME_ASIS ? new Date(row.STIME_ASIS).toLocaleString() : '',
            //     ETIME_ASIS: row.ETIME_ASIS ? new Date(row.ETIME_ASIS).toLocaleString() : ''
            // }));
            return rows;
        } catch (err) {
            throw err;
        } finally {
            if (conn) conn.release();
        }
    },
    /**
     * 성능 테스트 데이터 삭제
     * tperftest 테이블에서만 삭제
     */
    deletePerformanceData: async (pkeys) => {
        let conn;
        try {
            conn = await mondb.getConnection();
            if (!pkeys || pkeys.length === 0) {
                return { success: true, message: "삭제할 데이터가 없습니다" };
            }
            // PKEY 리스트를 사용하여 삭제
            // pkeys는 숫자 배열이어야 함
            const sql = `DELETE FROM tperftest WHERE PKEY IN (?)`;
            const result = await conn.query(sql, [pkeys]);

            return { success: true, message: "성공적으로 삭제되었습니다", rdata: 1 };
        } catch (err) {
            console.error("Delete Error:", err);
            throw err;
        } finally {
            if (conn) conn.release();
        }
    }
};

export default tperpormManagement;
