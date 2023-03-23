package com.xiaomi.mone.log.manager.service.statement;

import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;

import java.util.List;

public class NotAllStatementMatchParse implements StatementMatchParse {
    @Override
    public BoolQueryBuilder matchBuild(List<QueryEntity> queryEntities) {
        BoolQueryBuilder boolQueryBuilder = QueryBuilders.boolQuery();
        for (QueryEntity entity : queryEntities) {
            boolQueryBuilder.mustNot(QueryBuilders.queryStringQuery(entity.getFieldValue()));
        }
        return boolQueryBuilder;
    }
}
