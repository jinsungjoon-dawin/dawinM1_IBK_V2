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

            // 1. tapid (업무) - APID 기준 Upsert
            const sqlTapid = `
                INSERT INTO tapid (APID, APNM)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE
                    APNM = VALUES(APNM)
            `;
            await conn.query(sqlTapid, [data.APID, data.APNM]);

            // 2. tsid (서비스) - SID 기준 Upsert (Auto Increment지만 ID 지정)
            const sqlTsid = `
                INSERT INTO tsid (SID, APID, SVCNM, \`DESC\`)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    APID = VALUES(APID),
                    SVCNM = VALUES(SVCNM),
                    \`DESC\` = VALUES(\`DESC\`)
            `;
            await conn.query(sqlTsid, [data.SID, data.APID, data.SVCNM, data.DESC]);

            // 3. tperfcode (테스트 차수) - TID 기준 Upsert
            const sqlTperfcode = `
                INSERT INTO tperfcode (TID, SEQ, TNAME, gb, startDt, lastDt, asisDt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    SEQ = VALUES(SEQ),
                    TNAME = VALUES(TNAME),
                    gb = VALUES(gb),
                    startDt = VALUES(startDt),
                    lastDt = VALUES(lastDt),
                    asisDt = VALUES(asisDt)
            `;
            // 날짜 필드가 null이면 현재 날짜나 기본값 처리 필요할 수 있음. 예시 데이터에 따라 조정.
            // 예시 데이터: "TSTIME": "2025-12-05..." 등은 tperftest용이고, tperfcode용 날짜는 예시에 명시되지 않았으나
            // 테이블 정의상 NOT NULL DEFAULT curdate()이므로, 값이 없으면 제외하거나 기본값 전달 필요.
            // 여기서는 입력 데이터에 해당 필드가 있다고 가정하거나, 없으면 현재 날짜를 사용하도록 처리.
            const curDate = new Date();
            await conn.query(sqlTperfcode, [
                data.TID,
                data.SEQ,
                data.TNAME,
                data.gb,
                data.startDt || curDate, // 입력 없으면 오늘
                data.lastDt || curDate,
                data.asisDt || curDate
            ]);

            // 4. tperftest (성능 결과) - TID + SID 기준 Upsert
            // 주의: tperftest 테이블에 (TID, SID) 복합 유니크 인덱스가 있어야 정상 작동함.
            // ALTER TABLE tperftest ADD UNIQUE KEY uk_tid_sid (TID, SID);
            const sqlTperftest = `
                INSERT INTO tperftest (
                    TID, SID, TSTIME, STIME, ETIME, SFLAG, SVCTIME,
                    STIME_ASIS, ETIME_ASIS, SVCTIME_ASIS, REGDT
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    TSTIME = VALUES(TSTIME),
                    STIME = VALUES(STIME),
                    ETIME = VALUES(ETIME),
                    SFLAG = VALUES(SFLAG),
                    SVCTIME = VALUES(SVCTIME),
                    STIME_ASIS = VALUES(STIME_ASIS),
                    ETIME_ASIS = VALUES(ETIME_ASIS),
                    SVCTIME_ASIS = VALUES(SVCTIME_ASIS),
                    REGDT = NOW()
            `;
            await conn.query(sqlTperftest, [
                data.TID,
                data.SID,
                data.TSTIME,
                data.STIME,
                data.ETIME,
                data.SFLAG,
                data.SVCTIME,
                data.STIME_ASIS,
                data.ETIME_ASIS,
                data.SVCTIME_ASIS
            ]);

            await conn.commit();
            return { success: true, message: "Data upserted successfully" };

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
                SELECT
                    ta.APID, ta.APNM,
                    ts.SVCNM, ts.\`DESC\`,
                    tp.TID, tc.SEQ, tc.TNAME, tc.gb,
                    ts.SID,
                    DATE_FORMAT(tp.TSTIME, '%Y-%m-%d %H:%i:%s') as TSTIME,
                    DATE_FORMAT(tp.STIME, '%Y-%m-%d %H:%i:%s') as STIME,
                    DATE_FORMAT(tp.ETIME, '%Y-%m-%d %H:%i:%s') as ETIME,
                    tp.SFLAG, tp.SVCTIME,
                    DATE_FORMAT(tp.STIME_ASIS, '%Y-%m-%d %H:%i:%s') as STIME_ASIS,
                    DATE_FORMAT(tp.ETIME_ASIS, '%Y-%m-%d %H:%i:%s') as ETIME_ASIS,
                    tp.SVCTIME_ASIS,
                    'old' as flag
                FROM tperftest tp
                JOIN tsid ts ON tp.SID = ts.SID
                JOIN tapid ta ON ts.APID = ta.APID
                JOIN tperfcode tc ON tp.TID = tc.TID
                WHERE tc.gb = '3'
                ${whereClause}
                order by ta.apid, tp.tid, ts.svcnm
            `;
            console.log(sql);
            const rows = await conn.query(sql, params);
            console.log(rows[0]);
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
    }
};

export default tperpormManagement;
