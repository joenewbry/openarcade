// BlockBusterHudIndicator.cs
// Unified HUD state for single held power-up slot.
// Supports states: none / ricochet / armor / block-buster.

using UnityEngine;

public class BlockBusterHudIndicator : MonoBehaviour
{
    [SerializeField] private TankControllerBase observedTank;

    [Header("Unified Power-Up States")]
    [SerializeField] private GameObject noneStateObject;
    [SerializeField] private GameObject ricochetStateObject;
    [SerializeField] private GameObject armorStateObject;
    [SerializeField] private GameObject blockBusterStateObject;

    [Header("Legacy Block-Buster Slots (optional)")]
    [SerializeField] private GameObject readyStateObject;

    private OffensivePowerupType currentState = OffensivePowerupType.None;

    private void Awake()
    {
        if (observedTank == null)
        {
            observedTank = GetComponentInParent<TankControllerBase>();
        }
    }

    private void OnEnable()
    {
        if (observedTank != null)
        {
            observedTank.HeldPowerupChanged += HandleHeldPowerupChanged;
            ApplyState(observedTank.HeldPowerup);
            return;
        }

        ApplyState(OffensivePowerupType.None);
    }

    private void OnDisable()
    {
        if (observedTank != null)
        {
            observedTank.HeldPowerupChanged -= HandleHeldPowerupChanged;
        }
    }

    private void HandleHeldPowerupChanged(OffensivePowerupType newState)
    {
        ApplyState(newState);
    }

    private void ApplyState(OffensivePowerupType newState)
    {
        currentState = newState;

        SetActive(noneStateObject, currentState == OffensivePowerupType.None);
        SetActive(ricochetStateObject, currentState == OffensivePowerupType.Ricochet);
        SetActive(armorStateObject, currentState == OffensivePowerupType.Armor);
        SetActive(blockBusterStateObject, currentState == OffensivePowerupType.BlockBuster);

        // Backwards compatibility for scenes wired to old ready-only object.
        SetActive(readyStateObject, currentState == OffensivePowerupType.BlockBuster);
    }

    private static void SetActive(GameObject target, bool isActive)
    {
        if (target != null)
        {
            target.SetActive(isActive);
        }
    }
}
