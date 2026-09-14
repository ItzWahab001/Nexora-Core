import discord

def is_staff(member: discord.Member, staff_role_id: int | None = None) -> bool:
    if member.guild_permissions.administrator:
        return True
    return bool(staff_role_id and any(r.id == staff_role_id for r in member.roles))

def can_manage(member: discord.Member) -> bool:
    return member.guild_permissions.manage_guild or member.guild_permissions.administrator
