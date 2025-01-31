from collections import namedtuple
from datetime import timedelta

from django.utils import timezone

from sentry import tsdb
from sentry.api.serializers import Serializer, register
from sentry.models import Environment, EnvironmentProject
from sentry.tsdb.base import TSDBModel

StatsPeriod = namedtuple("StatsPeriod", ("segments", "interval"))


@register(Environment)
class EnvironmentSerializer(Serializer):
    def serialize(self, obj, attrs, user):
        return {"id": str(obj.id), "name": obj.name}


@register(EnvironmentProject)
class EnvironmentProjectSerializer(Serializer):
    def serialize(self, obj, attrs, user):
        return {
            "id": str(obj.id),
            "name": obj.environment.name,
            "isHidden": obj.is_hidden is True,
        }


class GroupEnvironmentWithStatsSerializer(EnvironmentSerializer):
    STATS_PERIODS = {
        "24h": StatsPeriod(24, timedelta(hours=1)),
        "30d": StatsPeriod(30, timedelta(hours=24)),
    }

    def __init__(self, group, since=None, until=None):
        self.group = group
        self.since = since
        self.until = until

    def get_attrs(self, item_list, user):
        attrs = {item: {"stats": {}} for item in item_list}
        items = {self.group.id: []}
        for item in item_list:
            items[self.group.id].append(item.id)

        for key, (segments, interval) in self.STATS_PERIODS.items():
            until = self.until or timezone.now()
            since = self.since or until - (segments * interval)

            try:
                stats = tsdb.get_frequency_series(
                    model=TSDBModel.frequent_environments_by_group,
                    items=items,
                    start=since,
                    end=until,
                    rollup=int(interval.total_seconds()),
                )
            except NotImplementedError:
                # TODO(dcramer): probably should log this, but not worth
                # erring out
                stats = {}

            for item in item_list:
                attrs[item]["stats"][key] = [
                    (k, v[item.id]) for k, v in stats.get(self.group.id, {})
                ]
        return attrs

    def serialize(self, obj, attrs, user):
        result = super().serialize(obj, attrs, user)
        result["stats"] = attrs["stats"]
        return result
