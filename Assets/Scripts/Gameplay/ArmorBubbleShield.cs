// ArmorBubbleShield.cs
// One-time shield: absorbs exactly one positive-damage hit, then deactivates.

using System;
using UnityEngine;

public class ArmorBubbleShield : MonoBehaviour, IHitShield
{
    [SerializeField] private bool armedOnSpawn = false;

    private bool isArmed;

    public bool IsShieldActive => isArmed;

    public event Action<ArmorBubbleShield> ShieldActivated;
    public event Action<ArmorBubbleShield, int> ShieldConsumed;

    private void Awake()
    {
        isArmed = armedOnSpawn;
    }

    /// <summary>
    /// Arms the armor bubble if it is not already active.
    /// Returns true if activation happened.
    /// </summary>
    public bool ActivateShield()
    {
        if (isArmed)
        {
            return false;
        }

        isArmed = true;
        ShieldActivated?.Invoke(this);
        return true;
    }

    public bool TryAbsorbHit(int incomingDamage)
    {
        if (!isArmed || incomingDamage <= 0)
        {
            return false;
        }

        isArmed = false;
        ShieldConsumed?.Invoke(this, incomingDamage);
        return true;
    }
}
