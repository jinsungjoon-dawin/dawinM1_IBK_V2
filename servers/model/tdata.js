import mondb from '../db/dbconn.js';

const tdata = {
    /**
     * 데이타이관 차수 관리 리스트 조회
     */
    tdata_list: async (args) => {
        let sql = `select pkey, did, dbname, dbuser, tblAsis, tblTobe, idxAsis, idxTobe, objAsis, objTobe, invalidAsis, invalidTobe, checkTbl, checkErr 
                   from tdatatr 
                   where 1=1 `;
        if (args.searchtxt && args.searchtxt !== '') {
            sql += ` and (dbname like '%${args.searchtxt}%' or dbuser like '%${args.searchtxt}%') `;
        }
        sql += ` order by pkey desc `;
        let rows = await mondb.query(sql);
        return rows;
    },

    /**
     * 데이타이관 차수 관리 등록
     */
    tdata_insert: async (args) => {
        // tdatacode에 did가 존재하는지 확인
        if (args.did && args.did > 0) {
            let checkSql = `select 1 from tdatacode where did = ?`;
            let checkRows = await mondb.query(checkSql, [args.did]);
            if (checkRows.length === 0) {
                throw new Error("DID_NOT_FOUND");
            }
        }

        let sql = `insert into tdatatr (did, dbname, dbuser, tblAsis, tblTobe, idxAsis, idxTobe, objAsis, objTobe, invalidAsis, invalidTobe, checkTbl, checkErr)
                   values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        let params = [
            args.did, args.dbname, args.dbuser,
            args.tblAsis || 0, args.tblTobe || 0,
            args.idxAsis || 0, args.idxTobe || 0,
            args.objAsis || 0, args.objTobe || 0,
            args.invalidAsis || 0, args.invalidTobe || 0,
            args.checkTbl || 0, args.checkErr || 0
        ];
        let result = await mondb.query(sql, params);
        return result.affectedRows;
    },

    /**
     * 데이타이관 차수 관리 수정
     */
    tdata_update: async (args) => {
        let sql = `update tdatatr set 
                    dbname = ?, dbuser = ?, 
                    tblAsis = ?, tblTobe = ?, 
                    idxAsis = ?, idxTobe = ?, 
                    objAsis = ?, objTobe = ?, 
                    invalidAsis = ?, invalidTobe = ?, 
                    checkTbl = ?, checkErr = ?
                   where pkey = ?`;
        let params = [
            args.dbname, args.dbuser,
            args.tblAsis || 0, args.tblTobe || 0,
            args.idxAsis || 0, args.idxTobe || 0,
            args.objAsis || 0, args.objTobe || 0,
            args.invalidAsis || 0, args.invalidTobe || 0,
            args.checkTbl || 0, args.checkErr || 0,
            args.pkey
        ];
        let result = await mondb.query(sql, params);
        return result.affectedRows;
    },

    /**
     * 데이타이관 차수 관리 삭제
     */
    tdata_delete: async (args) => {
        let sql = `delete from tdatatr where pkey = ?`;
        let result = await mondb.query(sql, [args.pkey]);
        return result.affectedRows;
    }
}

export default tdata;
