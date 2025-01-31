# Generated by Django 2.2.28 on 2023-01-31 20:37

from django.db import migrations

from sentry.api.utils import generate_region_url
from sentry.new_migrations.migrations import CheckedMigration
from sentry.utils.query import RangeQuerySetWrapperWithProgressBar


def backfill_user_avatar(apps, schema_editor):
    User = apps.get_model("sentry", "User")
    UserAvatar = apps.get_model("sentry", "UserAvatar")

    for user in RangeQuerySetWrapperWithProgressBar(User.objects.all()):
        avatar = UserAvatar.objects.filter(user_id=user.id).first()
        if avatar is None:
            continue
        user.avatar_type = avatar.avatar_type
        # type 1 = uploaded file.
        if avatar.avatar_type == 1:
            user.avatar_url = f"{generate_region_url()}/avatar/{avatar.ident}/"
        user.save(update_fields=["avatar_url", "avatar_type"])


class Migration(CheckedMigration):
    # This flag is used to mark that a migration shouldn't be automatically run in production. For
    # the most part, this should only be used for operations where it's safe to run the migration
    # after your code has deployed. So this should not be used for most operations that alter the
    # schema of a table.
    # Here are some things that make sense to mark as dangerous:
    # - Large data migrations. Typically we want these to be run manually by ops so that they can
    #   be monitored and not block the deploy for a long period of time while they run.
    # - Adding indexes to large tables. Since this can take a long time, we'd generally prefer to
    #   have ops run this and not block the deploy. Note that while adding an index is a schema
    #   change, it's completely safe to run the operation after the code has deployed.
    is_dangerous = True

    dependencies = [
        ("sentry", "0403_backfill_actors"),
    ]

    operations = [
        migrations.RunPython(
            backfill_user_avatar,
            reverse_code=migrations.RunPython.noop,
            hints={"tables": ["auth_user", "sentry_useravatar"]},
        )
    ]
